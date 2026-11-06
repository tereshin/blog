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

  transaction<TResult>(work: (tx: Database) => Promise<TResult>): Promise<TResult> {
    return this.db.transaction((tx) => work(tx))
  }

  async countView(tx: Database, input: { article_id: string; viewer_key: string }): Promise<boolean> {
    // Каждое открытие увеличивает счётчик, в том числе повторное тем же зрителем.
    const updated = await tx
      .insert(views)
      .values({ article_id: input.article_id, viewer_key: input.viewer_key, times: 1 })
      .onConflictDoUpdate({
        target: [views.article_id, views.viewer_key],
        set: { counted_at: sql`now()`, times: sql`${views.times} + 1` },
      })
      .returning({ article_id: views.article_id })
    return updated.length > 0
  }
}
