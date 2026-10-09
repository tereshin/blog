import { and, eq, gt, isNull } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { sessions, users } from '../../infra/db/schema.ts'
import type { SessionRepository } from './session.types.ts'

export function createSessionRepository(db: NodePgDatabase): SessionRepository {
  return {
    async findActive(session_id, now) {
      const [row] = await db
        .select({
          user_id: users.id,
          role: users.role,
          restricted_at: users.restricted_at,
          can_publish: users.can_publish,
          email_verified: users.email_verified,
        })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.user_id))
        .where(and(eq(sessions.id, session_id), isNull(sessions.revoked_at), gt(sessions.expires_at, now)))
        .limit(1)
      if (!row) return null
      return {
        user_id: row.user_id,
        role: row.role,
        is_restricted: row.restricted_at !== null,
        can_publish: row.can_publish,
        email_verified: row.email_verified,
      }
    },
  }
}
