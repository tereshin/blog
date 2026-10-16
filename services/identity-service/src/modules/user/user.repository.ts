import { and, asc, eq, gt, ilike, inArray, isNull, lte, or } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { UserRestrictedV1, UserUpdatedV1 } from '@blog/contracts'
import type { UpdateAppearance } from '@blog/contracts'
import { appendToOutbox, newEventId } from '@blog/broker'
import type { Database } from '@blog/broker'
import { sessions, users } from '../../infra/db/schema.ts'
import { sessionRevokedEvent } from '../../shared/session-events.ts'
import type { AccountRow, UserRepositoryPort } from './user.types.ts'

function toRow(row: typeof users.$inferSelect): AccountRow {
  return {
    id: row.id,
    public_number: row.public_number,
    email: row.email,
    email_verified: row.email_verified,
    role: row.role,
    can_publish: row.can_publish,
    restricted_at: row.restricted_at,
    deleted_at: row.deleted_at,
    created_at: row.created_at,
  }
}

function envelope(name: string, correlation_id: string) {
  return {
    event_id: newEventId(),
    name,
    occurred_at: new Date().toISOString(),
    correlation_id,
    causation_id: null,
    version: 1 as const,
  }
}

function snapshot(user: AccountRow) {
  return {
    user_id: user.id,
    public_number: user.public_number,
    role: user.role,
    can_publish: user.can_publish,
    is_restricted: user.restricted_at !== null,
    is_deleted: user.deleted_at !== null,
    created_at: user.created_at.toISOString(),
  }
}

export class UserRepository implements UserRepositoryPort {
  private readonly database: Database

  constructor(private readonly db: NodePgDatabase) {
    this.database = db as Database
  }

  async search({
    q,
    cursor,
    limit,
    role,
    name_ids,
    through,
  }: {
    q: string
    cursor: number
    limit: number
    role?: AccountRow['role'] | undefined
    name_ids?: string[] | undefined
    through?: number | undefined
  }): Promise<AccountRow[]> {
    const needle = q.replace(/[\\%_]/g, '\\$&').trim()
    const as_number = /^\d+$/.test(q) ? Number(q) : null
    const matches = [
      ...(name_ids?.length ? [inArray(users.id, name_ids)] : []),
      ...(needle ? [ilike(users.email, `%${needle}%`)] : []),
      ...(as_number === null ? [] : [eq(users.public_number, as_number)]),
    ]
    const match = matches.length > 0 ? or(...matches) : undefined
    const rows = await this.db
      .select()
      .from(users)
      .where(
        and(
          gt(users.public_number, cursor),
          isNull(users.deleted_at),
          through ? lte(users.public_number, through) : undefined,
          match,
          role ? eq(users.role, role) : undefined,
        ),
      )
      .orderBy(asc(users.public_number))
      .limit(limit)
    return rows.map(toRow)
  }

  async remove(input: { id: string; correlation_id: string }): Promise<void> {
    await this.database.transaction(async (tx) => {
      // Lock against concurrent role changes before removing an account.
      const [current] = await tx.select().from(users).where(eq(users.id, input.id)).for('update')
      if (!current || current.role === 'superadmin') return
      const [row] = await tx
        .update(users)
        .set({ deleted_at: new Date(), restricted_at: new Date(), can_publish: false })
        .where(eq(users.id, input.id))
        .returning()
      if (!row) return
      const revoked = await tx
        .update(sessions)
        .set({ revoked_at: new Date() })
        .where(and(eq(sessions.user_id, input.id), isNull(sessions.revoked_at)))
        .returning({ id: sessions.id })
      if (revoked.length)
        await appendToOutbox(
          tx,
          sessionRevokedEvent({
            correlation_id: input.correlation_id,
            session_ids: revoked.map((item) => item.id),
            user_id: input.id,
          }),
        )
      await appendToOutbox(
        tx,
        UserRestrictedV1.parse({
          ...envelope('identity.user.restricted', input.correlation_id),
          ...snapshot(toRow(row)),
        }),
      )
    })
  }

  async findById(id: string): Promise<AccountRow | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deleted_at)))
      .limit(1)
    return row ? toRow(row) : null
  }

  async setRole(input: {
    id: string
    role: 'member' | 'admin'
    correlation_id: string
  }): Promise<AccountRow | null> {
    return this.database.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(users)
        .where(and(eq(users.id, input.id), isNull(users.deleted_at)))
        .for('update')
      if (!current || current.role === 'superadmin') return current ? toRow(current) : null
      if (current.role === input.role) return toRow(current)
      const [row] = await tx
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, input.id))
        .returning()
      if (!row) return null
      const user = toRow(row)
      await appendToOutbox(
        tx,
        UserUpdatedV1.parse({
          ...envelope('identity.user.updated', input.correlation_id),
          ...snapshot(user),
        }),
      )
      return user
    })
  }

  async setPublishing(input: {
    id: string
    can_publish: boolean
    correlation_id: string
  }): Promise<AccountRow | null> {
    return this.database.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(users)
        .where(and(eq(users.id, input.id), isNull(users.deleted_at)))
        .for('update')
      if (!current) return null
      if (current.can_publish === input.can_publish) return toRow(current)
      const [row] = await tx
        .update(users)
        .set({ can_publish: input.can_publish })
        .where(eq(users.id, input.id))
        .returning()
      if (!row) return null
      const user = toRow(row)
      await appendToOutbox(
        tx,
        UserUpdatedV1.parse({
          ...envelope('identity.user.updated', input.correlation_id),
          ...snapshot(user),
        }),
      )
      return user
    })
  }

  async restrict(input: { id: string; correlation_id: string }): Promise<AccountRow | null> {
    return this.database.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(users)
        .where(and(eq(users.id, input.id), isNull(users.deleted_at)))
        .for('update')
      if (!current || current.role === 'superadmin') return current ? toRow(current) : null
      if (current.restricted_at) return toRow(current)
      const [row] = await tx
        .update(users)
        .set({ restricted_at: new Date() })
        .where(eq(users.id, input.id))
        .returning()
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
      await appendToOutbox(
        tx,
        UserRestrictedV1.parse({
          ...envelope('identity.user.restricted', input.correlation_id),
          ...snapshot(user),
        }),
      )
      return user
    })
  }

  async setAppearance(input: {
    id: string
    appearance: UpdateAppearance['appearance']
    correlation_id: string
  }): Promise<UpdateAppearance | null> {
    return this.database.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(users)
        .where(and(eq(users.id, input.id), isNull(users.deleted_at)))
        .for('update')
      if (!current) return null
      if (current.appearance === input.appearance) return { appearance: current.appearance }
      const [row] = await tx
        .update(users)
        .set({ appearance: input.appearance })
        .where(eq(users.id, input.id))
        .returning()
      if (!row) return null
      await appendToOutbox(
        tx,
        UserUpdatedV1.parse({
          ...envelope('identity.user.updated', input.correlation_id),
          ...snapshot(toRow(row)),
        }),
      )
      return { appearance: row.appearance }
    })
  }

  async unrestrict(input: { id: string; correlation_id: string }): Promise<AccountRow | null> {
    return this.database.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(users)
        .where(and(eq(users.id, input.id), isNull(users.deleted_at)))
        .for('update')
      if (!current || current.role === 'superadmin') return current ? toRow(current) : null
      if (!current.restricted_at) return toRow(current)
      const [row] = await tx
        .update(users)
        .set({ restricted_at: null })
        .where(eq(users.id, input.id))
        .returning()
      if (!row) return null
      const user = toRow(row)
      await appendToOutbox(
        tx,
        UserRestrictedV1.parse({
          ...envelope('identity.user.restricted', input.correlation_id),
          ...snapshot(user),
        }),
      )
      return user
    })
  }
}
