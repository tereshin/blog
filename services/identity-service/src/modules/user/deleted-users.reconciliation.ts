import { and, asc, gt, isNotNull } from 'drizzle-orm'
import { newEventId, outbox } from '@blog/broker'
import type { Database } from '@blog/broker'
import { UserRestrictedV1 } from '@blog/contracts'
import { users } from '../../infra/db/schema.ts'

const BATCH_SIZE = 100

/** Fresh event IDs repair copies even when old code already acknowledged deletion. */
export async function reconcileDeletedUsers(db: Database): Promise<number> {
  let cursor = 0
  let total = 0
  for (;;) {
    const page = await db.transaction(async (tx) => {
      const rows = await tx
        .select({
          id: users.id,
          public_number: users.public_number,
          role: users.role,
          created_at: users.created_at,
        })
        .from(users)
        .where(and(isNotNull(users.deleted_at), gt(users.public_number, cursor)))
        .orderBy(asc(users.public_number))
        .limit(BATCH_SIZE)
      if (!rows.length) return { size: 0, cursor }
      const events = rows.map((user) =>
        UserRestrictedV1.parse({
          event_id: newEventId(),
          name: 'identity.user.restricted',
          version: 1,
          occurred_at: new Date().toISOString(),
          correlation_id: 'startup:deleted-users',
          causation_id: null,
          user_id: user.id,
          public_number: user.public_number,
          role: user.role,
          can_publish: false,
          is_restricted: true,
          is_deleted: true,
          created_at: user.created_at.toISOString(),
        }),
      )
      await tx
        .insert(outbox)
        .values(events.map((event) => ({ id: event.event_id, name: event.name, payload: event })))
      return { size: rows.length, cursor: rows.at(-1)?.public_number ?? cursor }
    })
    total += page.size
    cursor = page.cursor
    if (page.size < BATCH_SIZE) return total
  }
}
