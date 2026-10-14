import type { ServiceContext } from '@blog/contracts'
import { canRead } from '../../shared/can-read.ts'
import { ArticleNotFoundError } from './access.errors.ts'
import type { AccessRepositoryPort, ArticleAccess } from './access.types.ts'

export class AccessService {
  constructor(private readonly repository: AccessRepositoryPort) {}

  async getAccess(viewer: ServiceContext, article_id: string): Promise<ArticleAccess> {
    const article = await this.repository.findArticle(article_id)
    if (!article) throw new ArticleNotFoundError()
    return {
      can_read: canRead(viewer, article),
      visibility: article.visibility,
      status: article.status,
      author_id: article.author_id,
    }
  }
}
