import { canReadArticle } from '../../shared/can-read.ts'
import { requireVerifiedEmail } from '../../shared/require-verified-email.ts'
import type { BookmarkPage, BookmarkState, ServiceContext } from '@blog/contracts'
import { EmailUnverifiedError, RestrictedError, UnauthorizedError, ValidationError } from '@blog/errors'
import { BookmarkNotAllowedError } from './bookmark.errors.ts'
import { decodeBookmarkCursor, encodeBookmarkCursor } from './bookmark.schema.ts'
import type { BookmarkCursor } from './bookmark.schema.ts'
import type { ArticleCountersPort, BookmarkEventsPort, BookmarkRepositoryPort } from './bookmark.types.ts'

export class BookmarkService<TTx> {
  constructor(
    private readonly repository: BookmarkRepositoryPort<TTx>,
    private readonly counters: ArticleCountersPort<TTx>,
    private readonly events: BookmarkEventsPort<TTx>,
  ) {}

  put(viewer: ServiceContext, article_id: string, correlation_id: string): Promise<BookmarkState> {
    return this.change(viewer, article_id, true, correlation_id)
  }

  remove(viewer: ServiceContext, article_id: string, correlation_id: string): Promise<BookmarkState> {
    return this.change(viewer, article_id, false, correlation_id)
  }

  async list(viewer: ServiceContext, query: { cursor?: string; limit: number }): Promise<BookmarkPage> {
    if (viewer.user_id === undefined) throw new UnauthorizedError()
    let cursor: BookmarkCursor | null = null
    if (query.cursor) {
      try {
        cursor = decodeBookmarkCursor(query.cursor)
      } catch (error) {
        throw new ValidationError({ message: 'Некорректный курсор', cause: error })
      }
    }
    const rows = await this.repository.list(viewer, viewer.user_id, cursor, query.limit + 1)
    const page = rows.slice(0, query.limit)
    const last = page.at(-1)
    const next_cursor = rows.length > query.limit && last ? encodeBookmarkCursor({ t: last.created_at.toISOString(), id: last.article_id }) : null
    return { article_ids: page.map((row) => row.article_id), next_cursor }
  }

  private async change(viewer: ServiceContext, article_id: string, is_bookmarked: boolean, correlation_id: string): Promise<BookmarkState> {
    if (viewer.user_id === undefined) throw new UnauthorizedError()
    if (viewer.is_restricted) throw new RestrictedError()
    if (!requireVerifiedEmail(viewer).allowed) throw new EmailUnverifiedError()
    const user_id = viewer.user_id
    const article = await this.repository.findArticle(article_id)
    // Черновик, скрытая и закрытая от зрителя статья в закладки не попадают.
    if (!article || article.status !== 'published' || !canReadArticle(viewer, article)) throw new BookmarkNotAllowedError()
    return this.repository.transaction(async (tx) => {
      await this.repository.setBookmarked(tx, { user_id, article_id, is_bookmarked })
      const snapshot = await this.counters.loadCounters(tx, article_id)
      await this.events.appendCountersUpdated(tx, { correlation_id, snapshot })
      return { article_id, bookmark_count: snapshot.bookmark_count, is_bookmarked }
    })
  }
}
