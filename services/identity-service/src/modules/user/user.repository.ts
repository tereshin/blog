import { and, asc, eq, gt, ilike, isNull, or } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { UserRestrictedV1, UserUpdatedV1 } from '@blog/contracts'
import { appendToOutbox, newEventId } from '@blog/broker'
import type { Database } from '@blog/broker'
import { sessionRevokedEvent } from '../auth/auth.events.ts'
import { sessions, users } from '../../infra/db/schema.ts'
import type { AccountRow, UserRepository } from './user.types.ts'

function toRow(row: typeof users.$inferSelect): AccountRow {
  return {
    id: row.id,
    public_number: row.public_number,
    email: row.email,
    role: row.role,
    can_publish: row.can_publish,
    restricted_at: row.restricted_at,
    created_at: row.created_at,
  }
}

function envelope(name: string, correlation_id: string) {
  return { event_id: newEventId(), name, occurred_at: new Date().toISOString(), correlation_id, causation_id: null, version: 1 as const }
}

function snapshot(user: AccountRow) {
  return {
    user_id: user.id,
    public_number: user.public_number,
    role: user.role,
    can_publish: user.can_publish,
    is_restricted: user.restricted_at !== null,
    created_at: user.created_at.toISOString(),
  }
}

export function createUserRepository(db: NodePgDatabase): UserRepository {
  return {
    async search({ q, cursor, limit }) {
      const needle = q.replace(/[%_]/g, '').trim()
      const as_number = /^\d+$/.test(q) ? Number(q) : null
      const matches = [
        ...(needle ? [ilike(users.email, `%${needle}%`)] : []),
        ...(as_number === null ? [] : [eq(users.public_number, as_number)]),
      ]
      const match = matches.length > 0 ? or(...matches) : undefined
      const rows = await db
        .select()
        .from(users)
        .where(match ? and(gt(users.public_number, cursor), match) : gt(users.public_number, cursor))
        .orderBy(asc(users.public_number))
        .limit(limit)
      return rows.map(toRow)
    },

    async findById(id) {
      const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1)
      return row ? toRow(row) : null
    },

    async setRole(input) {
      return (db as Database).transaction(async (tx) => {
        const [current] = await tx.select().from(users).where(eq(users.id, input.id)).limit(1)
        if (!current || current.role === 'superadmin') return current ? toRow(current) : null
        if (current.role === input.role) return toRow(current)
        const [row] = await tx.update(users).set({ role: input.role }).where(eq(users.id, input.id)).returning()
        if (!row) return null
        const user = toRow(row)
        await appendToOutbox(tx, UserUpdatedV1.parse({ ...envelope('identity.user.updated', input.correlation_id), ...snapshot(user) }))
        return user
      })
    },

    async setPublishing(input) {
      return (db as Database).transaction(async (tx) => {
        const [current] = await tx.select().from(users).where(eq(users.id, input.id)).limit(1)
        if (!current) return null
        if (current.can_publish === input.can_publish) return toRow(current)
        const [row] = await tx.update(users).set({ can_publish: input.can_publish }).where(eq(users.id, input.id)).returning()
        if (!row) return null
        const user = toRow(row)
        await appendToOutbox(tx, UserUpdatedV1.parse({ ...envelope('identity.user.updated', input.correlation_id), ...snapshot(user) }))
        return user
      })
    },

    async restrict(input) {
      return (db as Database).transaction(async (tx) => {
        const [current] = await tx.select().from(users).where(eq(users.id, input.id)).limit(1)
        if (!current || current.role === 'superadmin') return current ? toRow(current) : null
        if (current.restricted_at) return toRow(current)
        const [row] = await tx.update(users).set({ restricted_at: new Date() }).where(eq(users.id, input.id)).returning()
        if (!row) return null
        const revoked = await tx
          .update(sessions)
          .set({ revoked_at: new Date() })
          .where(and(eq(sessions.user_id, input.id), isNull(sessions.revoked_at)))
          .returning({ id: sessions.id })
        const user = toRow(row)
        if (revoked.length > 0) {
          await appendToOutbox(
            tx,
            sessionRevokedEvent({
              correlation_id: input.correlation_id,
              session_ids: revoked.map((item) => item.id),
              user_id: user.id,
            }),
          )
        }
        await appendToOutbox(tx, UserRestrictedV1.parse({ ...envelope('identity.user.restricted', input.correlation_id), ...snapshot(user) }))
        return user
      })
    },

    async setAppearance(input) {
      return (db as Database).transaction(async (tx) => {
        const [current] = await tx.select().from(users).where(eq(users.id, input.id)).limit(1)
        if (!current) return null
        if (current.appearance === input.appearance) return current.appearance
        const [row] = await tx.update(users).set({ appearance: input.appearance }).where(eq(users.id, input.id)).returning()
        if (!row) return null
        await appendToOutbox(tx, UserUpdatedV1.parse({ ...envelope('identity.user.updated', input.correlation_id), ...snapshot(toRow(row)) }))
        return row.appearance
      })
    },

    async unrestrict(input) {
      return (db as Database).transaction(async (tx) => {
        const [current] = await tx.select().from(users).where(eq(users.id, input.id)).limit(1)
        if (!current || current.role === 'superadmin') return current ? toRow(current) : null
        if (!current.restricted_at) return toRow(current)
        const [row] = await tx.update(users).set({ restricted_at: null }).where(eq(users.id, input.id)).returning()
        if (!row) return null
        const user = toRow(row)
        await appendToOutbox(tx, UserRestrictedV1.parse({ ...envelope('identity.user.restricted', input.correlation_id), ...snapshot(user) }))
        return user
      })
    },
  }
}
