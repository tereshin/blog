import { eq, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { ArticleAccessFields } from '@blog/contracts'
import type { Database } from '@blog/broker'
import { articles_copy, views } from '../../infra/db/schema.ts'
import { loadArticleCounters } from '../article-snapshot/index.ts'
import { appendViewEvents } from './view.events.ts'

export type ViewRepository = {
  findArticle: (article_id: string) => Promise<ArticleAccessFields | null>
  readCount: (article_id: string) => Promise<number>
  record: (input: { article_id: string; viewer_key: string; correlation_id: string }) => Promise<{ counted: boolean; view_count: number }>
}

export function createViewRepository(db: NodePgDatabase): ViewRepository {
  return {
    async findArticle(article_id) {
      const [row] = await db
        .select({
          author_id: articles_copy.author_id,
          visibility: articles_copy.visibility,
          status: articles_copy.status,
        })
        .from(articles_copy)
        .where(eq(articles_copy.article_id, article_id))
        .limit(1)
      return row ?? null
    },

    async readCount(article_id) {
      const [row] = await db
        .select({ total: sql<number>`coalesce(sum(${views.times}), 0)::int` })
        .from(views)
        .where(eq(views.article_id, article_id))
      return Number(row?.total ?? 0)
    },

    async record(input) {
      return db.transaction(async (tx) => {
        const database = tx as Database
        // Конфликт обновляет строку только если прошло 30 минут: повтор внутри окна не возвращает строку и не увеличивает times.
        const updated = await database
          .insert(views)
          .values({ article_id: input.article_id, viewer_key: input.viewer_key, times: 1 })
          .onConflictDoUpdate({
            target: [views.article_id, views.viewer_key],
            set: { counted_at: sql`now()`, times: sql`${views.times} + 1` },
            setWhere: sql`${views.counted_at} < now() - interval '30 minutes'`,
          })
          .returning({ article_id: views.article_id })
        const snapshot = await loadArticleCounters(database, input.article_id)
        if (updated.length > 0) {
          await appendViewEvents(database, { correlation_id: input.correlation_id, occurred_at: new Date().toISOString(), snapshot })
        }
        return { counted: updated.length > 0, view_count: snapshot.view_count }
      })
    },
  }
}
