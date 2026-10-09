import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { articles, promotions } from '../../infra/db/schema.ts'
import type { PromotionRepository } from './promotion.types.ts'

export function createPromotionRepository(db: NodePgDatabase): PromotionRepository {
  return {
    async findArticle(article_id) {
      const [row] = await db
        .select({ id: articles.id, author_id: articles.author_id, status: articles.status })
        .from(articles)
        .where(eq(articles.id, article_id))
        .limit(1)
      return row ?? null
    },
    async find(article_id) {
      const [row] = await db
        .select({ article_id: promotions.article_id, confirmed_at: promotions.confirmed_at, until: promotions.until })
        .from(promotions)
        .where(eq(promotions.article_id, article_id))
        .limit(1)
      return row ?? null
    },
    async upsert(row) {
      const [saved] = await db
        .insert(promotions)
        .values(row)
        .onConflictDoUpdate({
          target: promotions.article_id,
          set: { confirmed_at: row.confirmed_at, until: row.until },
        })
        .returning({ article_id: promotions.article_id, confirmed_at: promotions.confirmed_at, until: promotions.until })
      if (!saved) throw new Error('promotion row was not written')
      return saved
    },
  }
}
