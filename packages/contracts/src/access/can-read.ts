import type { ServiceContext } from '../http/context.ts'

export type ArticleVisibility = 'public' | 'members' | 'author'
export type ArticleStatus = 'draft' | 'published' | 'hidden' | 'deleted'

export type ArticleAccessFields = {
  author_id: string
  visibility: ArticleVisibility
  status: ArticleStatus
}

/**
 * Единое правило «зритель может читать статью» (data-model.md, «Статья → Доступ»).
 * Его применяют content-service (выборки и `/internal/articles/{id}/access`) и gateway (фильтр SSE-кадров),
 * поэтому правило живёт здесь, а не копируется.
 *
 * `deleted` → никто; `draft` → автор; `hidden` → автор и администратор;
 * `published`: `public` → все, `members` → вошедший, `author` → автор и администратор.
 */
export function canReadArticle(viewer: ServiceContext, article: ArticleAccessFields): boolean {
  const is_author = viewer.user_id !== undefined && viewer.user_id === article.author_id
  const is_admin = viewer.role === 'admin' || viewer.role === 'superadmin'
  switch (article.status) {
    case 'deleted':
      return false
    case 'draft':
      return is_author
    case 'hidden':
      return is_author || is_admin
    case 'published':
      break
  }
  switch (article.visibility) {
    case 'public':
      return true
    case 'members':
      return viewer.role !== 'guest'
    case 'author':
      return is_author || is_admin
  }
}
