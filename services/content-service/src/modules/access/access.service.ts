import { canReadArticle } from '@blog/contracts'
import type { ArticleAccessFields, ServiceContext } from '@blog/contracts'
import { ArticleNotFoundError } from './access.errors.ts'
import type { AccessRepository, ArticleAccess } from './access.types.ts'

/** Чистая функция доступа: единственный источник правды о том, кто читает статью. */
export function canRead(viewer: ServiceContext, article: ArticleAccessFields): boolean {
  return canReadArticle(viewer, article)
}

export type AccessService = {
  getAccess: (viewer: ServiceContext, article_id: string) => Promise<ArticleAccess>
}

export function createAccessService(repository: AccessRepository): AccessService {
  return {
    async getAccess(viewer, article_id) {
      const article = await repository.findArticle(article_id)
      if (!article) throw new ArticleNotFoundError()
      return {
        can_read: canRead(viewer, article),
        visibility: article.visibility,
        status: article.status,
        author_id: article.author_id,
      }
    },
  }
}
