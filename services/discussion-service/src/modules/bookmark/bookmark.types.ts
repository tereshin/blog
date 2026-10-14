import type { ArticleAccessFields, ServiceContext } from '@blog/contracts'
import type { ArticleCounterSnapshot } from '../article-snapshot/index.ts'
import type { BookmarkCursor } from './bookmark.schema.ts'

export type BookmarkArticle = ArticleAccessFields & { article_id: string }

export type BookmarkRepositoryPort<TTx> = {
  findArticle: (article_id: string) => Promise<BookmarkArticle | null>
  transaction: <TResult>(work: (tx: TTx) => Promise<TResult>) => Promise<TResult>
  setBookmarked: (tx: TTx, input: { user_id: string; article_id: string; is_bookmarked: boolean }) => Promise<void>
  list: (viewer: ServiceContext, user_id: string, cursor: BookmarkCursor | null, limit: number) => Promise<{ article_id: string; created_at: Date }[]>
}

/** Счётчики статьи считает article-snapshot в транзакции закладки. */
export type ArticleCountersPort<TTx> = {
  loadCounters: (tx: TTx, article_id: string) => Promise<ArticleCounterSnapshot>
}

export type BookmarkEventsPort<TTx> = {
  appendCountersUpdated: (tx: TTx, input: { correlation_id: string; snapshot: ArticleCounterSnapshot }) => Promise<void>
}
