import { canReadArticle } from '@blog/contracts'
import { RestrictedError, UnauthorizedError, ValidationError } from '@blog/errors'
import { BookmarkNotAllowedError } from './bookmark.errors.ts'
import { decodeBookmarkCursor, encodeBookmarkCursor } from './bookmark.schema.ts'
import type { BookmarkRepository, BookmarkService } from './bookmark.types.ts'

export function createBookmarkService(repository: BookmarkRepository): BookmarkService {
  return {
    async put(viewer, article_id, correlation_id) {
      return change(repository, viewer, article_id, true, correlation_id)
    },
    async remove(viewer, article_id, correlation_id) {
      return change(repository, viewer, article_id, false, correlation_id)
    },
    async list(viewer, query) {
      if (viewer.user_id === undefined) throw new UnauthorizedError()
      let cursor: { t: string; id: string } | null = null
      if (query.cursor) {
        try {
          cursor = decodeBookmarkCursor(query.cursor)
        } catch (error) {
          throw new ValidationError({ message: 'Некорректный курсор', cause: error })
        }
      }
      const rows = await repository.list(viewer, viewer.user_id, cursor, query.limit + 1)
      const page = rows.slice(0, query.limit)
      const last = page.at(-1)
      const next_cursor = rows.length > query.limit && last ? encodeBookmarkCursor({ t: last.created_at.toISOString(), id: last.article_id }) : null
      return { article_ids: page.map((row) => row.article_id), next_cursor }
    },
  }
}

async function change(
  repository: BookmarkRepository,
  viewer: Parameters<BookmarkService['put']>[0],
  article_id: string,
  bookmarked: boolean,
  correlation_id: string,
) {
  if (viewer.user_id === undefined) throw new UnauthorizedError()
  if (viewer.is_restricted) throw new RestrictedError()
  const article = await repository.findArticle(article_id)
  // Черновик, скрытая и закрытая от зрителя статья в закладки не попадают.
  if (!article || article.status !== 'published' || !canReadArticle(viewer, article)) throw new BookmarkNotAllowedError()
  return repository.setBookmarked({ user_id: viewer.user_id, article_id, bookmarked, correlation_id })
}
