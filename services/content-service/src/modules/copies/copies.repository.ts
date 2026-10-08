import type { Database } from '@blog/broker'
import { profiles, users_copy } from '../../infra/db/schema.ts'

export type UserCopy = typeof users_copy.$inferInsert

/** Копии пишут только потребители событий; остальные модули сервиса копии читают. */
export const copiesRepository = {
  async upsertUser(tx: Database, copy: UserCopy): Promise<void> {
    await tx
      .insert(users_copy)
      .values(copy)
      .onConflictDoUpdate({
        target: users_copy.user_id,
        set: { role: copy.role, can_publish: copy.can_publish, is_restricted: copy.is_restricted },
      })
  },

  /** Профиль создаётся один раз; если человек уже задал имя сам, событие его не затирает. */
  async createProfileIfMissing(tx: Database, user_id: string, display_name: string): Promise<void> {
    await tx.insert(profiles).values({ user_id, display_name }).onConflictDoNothing({ target: profiles.user_id })
  },
}
