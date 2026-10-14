import type { ArticleAccessFields, ServiceContext } from '@blog/contracts'
import type { ArticleCounterSnapshot } from '../article-snapshot/index.ts'

export type RecordViewInput = {
  viewer: ServiceContext
  article_id: string
  context?: 'moderation' | undefined
  correlation_id: string
}

export type ViewRepositoryPort<TTx> = {
  findArticle: (article_id: string) => Promise<ArticleAccessFields | null>
  readCount: (article_id: string) => Promise<number>
  transaction: <TResult>(work: (tx: TTx) => Promise<TResult>) => Promise<TResult>
  /** `true`, если просмотр засчитан: первая строка зрителя или окно 30 минут истекло. */
  countView: (tx: TTx, input: { article_id: string; viewer_key: string }) => Promise<boolean>
}

/** Счётчики статьи считает article-snapshot в транзакции просмотра. */
export type ArticleCountersPort<TTx> = {
  loadCounters: (tx: TTx, article_id: string) => Promise<ArticleCounterSnapshot>
}

export type ViewEventsPort<TTx> = {
  appendViewCounted: (tx: TTx, input: { correlation_id: string; occurred_at: string; snapshot: ArticleCounterSnapshot }) => Promise<void>
}
