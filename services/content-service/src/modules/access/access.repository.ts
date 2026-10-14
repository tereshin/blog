import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { ArticleAccessFields } from '@blog/contracts'
import { articles } from '../../infra/db/schema.ts'
import type { AccessRepositoryPort } from './access.types.ts'

export class AccessRepository implements AccessRepositoryPort {
  constructor(private readonly db: NodePgDatabase) {}

  async findArticle(article_id: string): Promise<ArticleAccessFields | null> {
    const [row] = await this.db
      .select({ author_id: articles.author_id, visibility: articles.visibility, status: articles.status })
      .from(articles)
      .where(eq(articles.id, article_id))
      .limit(1)
    return row ?? null
  }
}
