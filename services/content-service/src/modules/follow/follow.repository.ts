import { and, eq, inArray } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { FollowTargetType } from '@blog/contracts'
import { follows, topics, users_copy } from '../../infra/db/schema.ts'
import type { FollowRepository } from './follow.types.ts'

export function createFollowRepository(db: NodePgDatabase): FollowRepository {
  return {
    async userExists(user_id) {
      const [row] = await db.select({ user_id: users_copy.user_id }).from(users_copy).where(eq(users_copy.user_id, user_id)).limit(1)
      return row !== undefined
    },
    async topicExists(topic_id) {
      const [row] = await db.select({ id: topics.id }).from(topics).where(eq(topics.id, topic_id)).limit(1)
      return row !== undefined
    },
    async follow(follower_id, target_type, target_id) {
      await db.insert(follows).values({ follower_id, target_type, target_id }).onConflictDoNothing()
    },
    async unfollow(follower_id, target_type, target_id) {
      await db.delete(follows).where(and(eq(follows.follower_id, follower_id), eq(follows.target_type, target_type), eq(follows.target_id, target_id)))
    },
    async isFollowing(follower_id, target_type, target_id) {
      const [row] = await db
        .select({ target_id: follows.target_id })
        .from(follows)
        .where(and(eq(follows.follower_id, follower_id), eq(follows.target_type, target_type), eq(follows.target_id, target_id)))
        .limit(1)
      return row !== undefined
    },
    async list(follower_id, filter) {
      const target_ids = filter.target_ids
      const rows = await db
        .select({ target_type: follows.target_type, target_id: follows.target_id })
        .from(follows)
        .where(
          and(
            eq(follows.follower_id, follower_id),
            filter.target_type ? eq(follows.target_type, filter.target_type) : undefined,
            target_ids && target_ids.length > 0 ? inArray(follows.target_id, [...target_ids]) : undefined,
          ),
        )
      return rows.map((row) => ({ target_type: row.target_type as FollowTargetType, target_id: row.target_id }))
    },
  }
}
