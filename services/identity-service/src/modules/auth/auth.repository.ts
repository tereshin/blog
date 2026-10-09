import { randomUUID } from 'node:crypto'
import { and, eq, gt, isNull, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { appendToOutbox } from '@blog/broker'
import type { Database } from '@blog/broker'
import { auth_identities, auth_idempotency, sessions, settings_copy, users } from '../../infra/db/schema.ts'
import { sessionRevokedEvent, userCreatedEvent } from './auth.events.ts'
import { displayNameFromEmail, normalizeEmail } from './auth.policy.ts'
import type { AccountUser, AuthRepository } from './auth.types.ts'

function toUser(row: typeof users.$inferSelect): AccountUser {
  return {
    id: row.id,
    email: row.email,
    email_verified: row.email_verified,
    role: row.role,
    can_publish: row.can_publish,
    restricted_at: row.restricted_at,
    public_number: row.public_number,
    appearance: row.appearance,
    created_at: row.created_at,
  }
}

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === '23505'
}

export function createAuthRepository(db: NodePgDatabase): AuthRepository {
  const database = db as Database

  return {
    async readSettings() {
      const [row] = await db.select().from(settings_copy).where(eq(settings_copy.id, 1)).limit(1)
      return row
        ? { registration_open: row.registration_open, new_members_can_publish: row.new_members_can_publish }
        : { registration_open: true, new_members_can_publish: true }
    },

    async findByUid(firebase_uid) {
      const [row] = await db
        .select({ user: users })
        .from(auth_identities)
        .innerJoin(users, eq(users.id, auth_identities.user_id))
        .where(eq(auth_identities.firebase_uid, firebase_uid))
        .limit(1)
      return row ? toUser(row.user) : null
    },

    async findByEmail(email) {
      const normalized = normalizeEmail(email)
      if (!normalized) return null
      const [row] = await db.select().from(users).where(sql`lower(${users.email}) = ${normalized} and ${users.email} <> ''`).limit(1)
      return row ? toUser(row) : null
    },

    async findIdentityUserId(firebase_uid) {
      const [row] = await db.select({ user_id: auth_identities.user_id }).from(auth_identities).where(eq(auth_identities.firebase_uid, firebase_uid)).limit(1)
      return row?.user_id ?? null
    },

    async findUidForUser(user_id) {
      const [row] = await db.select({ firebase_uid: auth_identities.firebase_uid }).from(auth_identities).where(eq(auth_identities.user_id, user_id)).limit(1)
      return row?.firebase_uid ?? null
    },

    async findBySession(session_id, now) {
      const [row] = await db
        .select({ user: users })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.user_id))
        .where(and(eq(sessions.id, session_id), isNull(sessions.revoked_at), gt(sessions.expires_at, now)))
        .limit(1)
      return row ? toUser(row.user) : null
    },

    async openSession(input) {
      await database.insert(sessions).values({ id: input.session_id, user_id: input.user_id, expires_at: input.expires_at })
    },

    async attachUid(input) {
      await database.transaction(async (tx) => {
        await tx.insert(auth_identities).values({
          id: randomUUID(),
          user_id: input.user_id,
          firebase_uid: input.firebase_uid,
          provider_id: input.provider_id,
        })
        if (input.email_verified) {
          await tx.update(users).set({ email_verified: true }).where(eq(users.id, input.user_id))
        }
      })
    },

    async createMember(input) {
      return database.transaction(async (tx) => {
        const [row] = await tx
          .insert(users)
          .values({
            id: randomUUID(),
            email: input.email,
            email_verified: input.email_verified,
            role: input.role,
            can_publish: input.can_publish,
          })
          .returning()
        if (!row) throw new Error('учётная запись не создана')
        const user = toUser(row)
        await tx.insert(auth_identities).values({
          id: randomUUID(),
          user_id: user.id,
          firebase_uid: input.firebase_uid,
          provider_id: input.provider_id,
        })
        if (input.session_id && input.expires_at) {
          await tx.insert(sessions).values({ id: input.session_id, user_id: user.id, expires_at: input.expires_at })
        }
        await appendToOutbox(
          tx,
          userCreatedEvent({
            correlation_id: input.correlation_id,
            user_id: user.id,
            public_number: user.public_number,
            role: user.role,
            can_publish: user.can_publish,
            is_restricted: user.restricted_at !== null,
            created_at: user.created_at.toISOString(),
            display_name: input.display_name,
          }),
        )
        return user
      })
    },

    async setEmail(input) {
      await database.update(users).set({ email: normalizeEmail(input.email), email_verified: false }).where(eq(users.id, input.user_id))
    },

    async markEmailVerified(firebase_uid) {
      const [identity] = await database
        .select({ user_id: auth_identities.user_id })
        .from(auth_identities)
        .where(eq(auth_identities.firebase_uid, firebase_uid))
        .limit(1)
      if (!identity) return false
      await database.update(users).set({ email_verified: true }).where(eq(users.id, identity.user_id))
      return true
    },

    async claimIdempotency(scope, key) {
      const inserted = await database
        .insert(auth_idempotency)
        .values({ scope, key, response: { status: 'pending' } })
        .onConflictDoNothing()
        .returning({ key: auth_idempotency.key })
      return inserted.length > 0
    },

    async revokeSession(session_id, correlation_id) {
      await database.transaction(async (tx) => {
        const [row] = await tx
          .update(sessions)
          .set({ revoked_at: new Date() })
          .where(and(eq(sessions.id, session_id), isNull(sessions.revoked_at)))
          .returning({ user_id: sessions.user_id })
        if (!row) return
        await appendToOutbox(tx, sessionRevokedEvent({ correlation_id, session_ids: [session_id], user_id: row.user_id }))
      })
    },

    async provisionSuperadmin(input) {
      const email = normalizeEmail(input.email)
      if (!email) throw new Error('SUPERADMIN_EMAIL не задан')
      const existing = await db.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1)
      if (existing[0]) return { created: false, user_id: existing[0].id }
      try {
        return await database.transaction(async (tx) => {
          const [row] = await tx
            .insert(users)
            .values({ id: randomUUID(), email, email_verified: false, role: 'superadmin', can_publish: true })
            .returning()
          if (!row) throw new Error('учётная запись суперадминистратора не создана')
          const user = toUser(row)
          await appendToOutbox(
            tx,
            userCreatedEvent({
              correlation_id: input.correlation_id,
              user_id: user.id,
              public_number: user.public_number,
              role: user.role,
              can_publish: user.can_publish,
              is_restricted: false,
              created_at: user.created_at.toISOString(),
              display_name: displayNameFromEmail(email),
            }),
          )
          return { created: true, user_id: user.id }
        })
      } catch (error) {
        if (!isUniqueViolation(error)) throw error
        const [row] = await db.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1)
        if (!row) throw error
        return { created: false, user_id: row.id }
      }
    },
  }
}
