import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { articles } from '../../infra/db/schema.ts'
import type { AccessRepository } from './access.types.ts'

export function createAccessRepository(db: NodePgDatabase): AccessRepository {
  return {
    async findArticle(article_id) {
      const [row] = await db
        .select({ author_id: articles.author_id, visibility: articles.visibility, status: articles.status })
        .from(articles)
        .where(eq(articles.id, article_id))
        .limit(1)
      return row ?? null
    },
  }
}
