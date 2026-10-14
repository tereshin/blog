import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { articles, promotions } from '../../infra/db/schema.ts'
import type { PromotionRepositoryPort } from './promotion.types.ts'

export class PromotionRepository implements PromotionRepositoryPort {
  constructor(private readonly db: NodePgDatabase) {}

  async findArticle(article_id: string) {
    const [row] = await this.db
      .select({ id: articles.id, author_id: articles.author_id, status: articles.status })
      .from(articles)
      .where(eq(articles.id, article_id))
      .limit(1)
    return row ?? null
  }

  async find(article_id: string) {
    const [row] = await this.db
      .select({ article_id: promotions.article_id, confirmed_at: promotions.confirmed_at, until: promotions.until })
      .from(promotions)
      .where(eq(promotions.article_id, article_id))
      .limit(1)
    return row ?? null
  }

  async upsert(row: { article_id: string; confirmed_at: Date; until: Date }) {
    const [saved] = await this.db
      .insert(promotions)
      .values(row)
      .onConflictDoUpdate({
        target: promotions.article_id,
        set: { confirmed_at: row.confirmed_at, until: row.until },
      })
      .returning({ article_id: promotions.article_id, confirmed_at: promotions.confirmed_at, until: promotions.until })
    if (!saved) throw new Error('promotion row was not written')
    return saved
  }
}
