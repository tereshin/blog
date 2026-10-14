import type { ArticleAccessFields, ServiceContext } from '@blog/contracts'

/**
 * То же правило, что у content-service: discussion держит копию, потому что
 * пакет контрактов не содержит бизнес-логики, а сервисы не импортируют друг друга.
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
