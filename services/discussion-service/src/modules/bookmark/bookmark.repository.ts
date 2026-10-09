import { and, desc, eq, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { ArticleCountersUpdatedV1 } from '@blog/contracts'
import { appendToOutbox, newEventId } from '@blog/broker'
import type { Database } from '@blog/broker'
import { articles_copy, bookmarks } from '../../infra/db/schema.ts'
import { readableArticleWhere } from '../access/readable-where.ts'
import { loadArticleCounters } from '../article-snapshot/index.ts'
import type { BookmarkRepository } from './bookmark.types.ts'

export function createBookmarkRepository(db: NodePgDatabase): BookmarkRepository {
  return {
    async findArticle(article_id) {
      const [row] = await db
        .select({
          article_id: articles_copy.article_id,
          author_id: articles_copy.author_id,
          visibility: articles_copy.visibility,
          status: articles_copy.status,
        })
        .from(articles_copy)
        .where(eq(articles_copy.article_id, article_id))
        .limit(1)
      if (!row) return null
      return { article_id: row.article_id, author_id: row.author_id, visibility: row.visibility, status: row.status }
    },

    async setBookmarked(input) {
      return db.transaction(async (tx) => {
        const database = tx as Database
        if (input.bookmarked) {
          await database
            .insert(bookmarks)
            .values({ user_id: input.user_id, article_id: input.article_id })
            .onConflictDoNothing()
        } else {
          await database.delete(bookmarks).where(and(eq(bookmarks.user_id, input.user_id), eq(bookmarks.article_id, input.article_id)))
        }
        const snapshot = await loadArticleCounters(database, input.article_id)
        const occurred_at = new Date().toISOString()
        await appendToOutbox(
          database,
          ArticleCountersUpdatedV1.parse({
            event_id: newEventId(),
            name: 'discussion.article_counters.updated',
            occurred_at,
            correlation_id: input.correlation_id,
            causation_id: null,
            version: 1,
            ...snapshot,
          }),
        )
        return { article_id: input.article_id, bookmark_count: snapshot.bookmark_count, is_bookmarked: input.bookmarked }
      })
    },

    async list(viewer, user_id, cursor, limit) {
      const after = cursor ? sql`(${bookmarks.created_at}, ${bookmarks.article_id}) < (${new Date(cursor.t)}, ${cursor.id})` : undefined
      return db
        .select({ article_id: bookmarks.article_id, created_at: bookmarks.created_at })
        .from(bookmarks)
        .innerJoin(articles_copy, eq(articles_copy.article_id, bookmarks.article_id))
        .where(and(eq(bookmarks.user_id, user_id), readableArticleWhere(viewer), after))
        .orderBy(desc(bookmarks.created_at), desc(bookmarks.article_id))
        .limit(limit)
    },
  }
}
