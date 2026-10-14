import { eq, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { ArticleAccessFields } from '@blog/contracts'
import type { Database } from '@blog/broker'
import { articles_copy, views } from '../../infra/db/schema.ts'
import type { ViewRepositoryPort } from './view.types.ts'

export class ViewRepository implements ViewRepositoryPort<Database> {
  constructor(private readonly db: NodePgDatabase) {}

  async findArticle(article_id: string): Promise<ArticleAccessFields | null> {
    const [row] = await this.db
      .select({
        author_id: articles_copy.author_id,
        visibility: articles_copy.visibility,
        status: articles_copy.status,
      })
      .from(articles_copy)
      .where(eq(articles_copy.article_id, article_id))
      .limit(1)
    return row ?? null
  }

  async readCount(article_id: string): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<number>`coalesce(sum(${views.times}), 0)::int` })
      .from(views)
      .where(eq(views.article_id, article_id))
    return Number(row?.total ?? 0)
  }

  transaction<TResult>(work: (tx: Database) => Promise<TResult>): Promise<TResult> {
    return this.db.transaction((tx) => work(tx))
  }

  async countView(tx: Database, input: { article_id: string; viewer_key: string }): Promise<boolean> {
    // Конфликт обновляет строку только если прошло 30 минут: повтор внутри окна не возвращает строку и не увеличивает times.
    const updated = await tx
      .insert(views)
      .values({ article_id: input.article_id, viewer_key: input.viewer_key, times: 1 })
      .onConflictDoUpdate({
        target: [views.article_id, views.viewer_key],
        set: { counted_at: sql`now()`, times: sql`${views.times} + 1` },
        setWhere: sql`${views.counted_at} < now() - interval '30 minutes'`,
      })
      .returning({ article_id: views.article_id })
    return updated.length > 0
  }
}
