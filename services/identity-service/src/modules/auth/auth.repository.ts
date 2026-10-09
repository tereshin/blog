import { randomUUID } from 'node:crypto'
import { and, eq, gt, isNull, lt, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { UserUpdatedV1 } from '@blog/contracts'
import { appendToOutbox, newEventId } from '@blog/broker'
import { sessionRevokedEvent, userCreatedEvent } from './auth.events.ts'
import type { Database } from '@blog/broker'
import { auth_states, sessions, settings_copy, users } from '../../infra/db/schema.ts'
import { hintFromEmail, normalizeEmail } from './auth.policy.ts'
import type { AccountUser, AuthRepository } from './auth.types.ts'

const STATE_TTL_MS = 15 * 60 * 1000

function toUser(row: typeof users.$inferSelect): AccountUser {
  return {
    id: row.id,
    email: row.email,
    google_sub: row.google_sub,
    role: row.role,
    can_publish: row.can_publish,
    restricted_at: row.restricted_at,
    public_number: row.public_number,
    appearance: row.appearance,
    created_at: row.created_at,
  }
}

function envelope(name: string, correlation_id: string) {
  return { event_id: newEventId(), name, occurred_at: new Date().toISOString(), correlation_id, causation_id: null, version: 1 as const }
}

function snapshot(user: AccountUser) {
  return {
    user_id: user.id,
    public_number: user.public_number,
    role: user.role,
    can_publish: user.can_publish,
    is_restricted: user.restricted_at !== null,
    created_at: user.created_at.toISOString(),
  }
}

export function createAuthRepository(db: NodePgDatabase): AuthRepository {
  return {
    async saveState(row) {
      const database = db as Database
      await database.delete(auth_states).where(lt(auth_states.created_at, new Date(Date.now() - STATE_TTL_MS)))
      await database.insert(auth_states).values(row)
    },

    async takeState(state) {
      const database = db as Database
      const [row] = await database.delete(auth_states).where(eq(auth_states.state, state)).returning()
      if (!row || row.created_at.getTime() < Date.now() - STATE_TTL_MS) return null
      return { code_verifier: row.code_verifier, nonce: row.nonce, return_to: row.return_to }
    },

    async readSettings() {
      const [row] = await db.select().from(settings_copy).where(eq(settings_copy.id, 1)).limit(1)
      return row
        ? { registration_open: row.registration_open, new_members_can_publish: row.new_members_can_publish }
        : { registration_open: true, new_members_can_publish: true }
    },

    async findBySub(sub) {
      const [row] = await db.select().from(users).where(eq(users.google_sub, sub)).limit(1)
      return row ? toUser(row) : null
    },

    async findByEmail(email) {
      const [row] = await db.select().from(users).where(sql`lower(${users.email}) = ${normalizeEmail(email)}`).limit(1)
      return row ? toUser(row) : null
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

    async loginExisting(input) {
      await (db as Database).transaction(async (tx) => {
        if (input.next_email) await tx.update(users).set({ email: input.next_email }).where(eq(users.id, input.user.id))
        await tx.insert(sessions).values({ id: input.session_id, user_id: input.user.id, expires_at: input.expires_at })
      })
    },

    async bindSuperadmin(input) {
      return (db as Database).transaction(async (tx) => {
        const role = 'superadmin' as const
        const [row] = await tx
          .update(users)
          .set({ google_sub: input.google_sub, role, can_publish: true })
          .where(and(eq(users.id, input.user.id), isNull(users.google_sub)))
          .returning()
        if (!row) throw new Error('учётная запись суперадминистратора уже привязана')
        const user = toUser(row)
        await tx.insert(sessions).values({ id: input.session_id, user_id: user.id, expires_at: input.expires_at })
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
        if (input.user.role !== role || !input.user.can_publish) {
          await appendToOutbox(tx, UserUpdatedV1.parse({ ...envelope('identity.user.updated', input.correlation_id), ...snapshot(user) }))
        }
        return user
      })
    },

    async createUser(input) {
      return (db as Database).transaction(async (tx) => {
        const [row] = await tx
          .insert(users)
          .values({
            id: randomUUID(),
            email: normalizeEmail(input.claims.email),
            google_sub: input.claims.sub,
            role: input.role,
            can_publish: input.can_publish,
          })
          .returning()
        if (!row) throw new Error('учётная запись не создана')
        const user = toUser(row)
        await tx.insert(sessions).values({ id: input.session_id, user_id: user.id, expires_at: input.expires_at })
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

    async provisionSuperadmin(input) {
      const email = normalizeEmail(input.email)
      if (!email) throw new Error('SUPERADMIN_EMAIL не задан')
      const existing = await db.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1)
      if (existing[0]) return { created: false, user_id: existing[0].id }
      try {
        return await (db as Database).transaction(async (tx) => {
          const [row] = await tx
            .insert(users)
            .values({ id: randomUUID(), email, google_sub: null, role: 'superadmin', can_publish: true })
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
              display_name: hintFromEmail(email),
            }),
          )
          return { created: true, user_id: user.id }
        })
      } catch (error) {
        if (!(typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === '23505')) throw error
        const [row] = await db.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1)
        if (!row) throw error
        return { created: false, user_id: row.id }
      }
    },

    async revokeSession(session_id, correlation_id) {
      await (db as Database).transaction(async (tx) => {
        const [row] = await tx
          .update(sessions)
          .set({ revoked_at: new Date() })
          .where(and(eq(sessions.id, session_id), isNull(sessions.revoked_at)))
          .returning({ user_id: sessions.user_id })
        if (!row) return
        await appendToOutbox(
          tx,
          sessionRevokedEvent({
            correlation_id,
            session_ids: [session_id],
            user_id: row.user_id,
          }),
        )
      })
    },
  }
}
