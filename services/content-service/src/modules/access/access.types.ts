import type { ArticleAccessFields } from '@blog/contracts'

/** Ответ владельца статьи о доступе зрителя (`GET /internal/articles/{id}/access`). */
export type ArticleAccess = {
  can_read: boolean
  visibility: ArticleAccessFields['visibility']
  status: ArticleAccessFields['status']
  author_id: string
}

export type AccessRepository = {
  findArticle: (article_id: string) => Promise<ArticleAccessFields | null>
}
