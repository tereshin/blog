import { and, desc, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { feed_seen } from '../../infra/db/schema.ts'
import type { SeenRepository } from './seen.types.ts'

export function createSeenRepository(db: NodePgDatabase): SeenRepository {
  return {
    async upsert(input) {
      const seen_at = new Date()
      await db
        .insert(feed_seen)
        .values({ viewer_key: input.viewer_key, feed_key: input.feed_key, article_id: input.article_id, seen_at })
        .onConflictDoUpdate({
          target: [feed_seen.viewer_key, feed_seen.feed_key, feed_seen.article_id],
          set: { seen_at },
        })
    },
    async list(viewer_key, feed_key, limit) {
      const rows = await db
        .select({ article_id: feed_seen.article_id })
        .from(feed_seen)
        .where(and(eq(feed_seen.viewer_key, viewer_key), eq(feed_seen.feed_key, feed_key)))
        .orderBy(desc(feed_seen.seen_at), desc(feed_seen.article_id))
        .limit(limit)
      return rows.map((row) => row.article_id)
    },
  }
}
