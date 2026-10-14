import type { ModerationFilters } from '@blog/contracts'
import type { StoredArticle } from '../article/index.ts'
import type { ModerationCursor } from './moderation.cursor.ts'

export type ModerationListFilter = 'reported' | 'hidden' | 'search'

export type ModerationArticleRow = {
  id: string
  author_id: string
  slug: string
  title: string
  excerpt: string
  first_image_url: string | null
  published_at: Date | null
  created_at: Date
  updated_at: Date
  visibility: StoredArticle['visibility']
  comments_enabled: boolean
  status: StoredArticle['status']
  reaction_counts: unknown
  reaction_count: number
  comment_count: number
  bookmark_count: number
  view_count: number
}

export type ModerationTopic = { id: string; title: string; slug: string; status: 'active' | 'archived' }

export type ModerationAuthorProfile = { display_name: string; avatar_url: string | null; slug: string | null; status_icon_id: string | null }

export type ModerationArticle = {
  article: ModerationArticleRow
  topic: ModerationTopic
  profile: ModerationAuthorProfile | null
  user: { public_number: number } | null
}

export type ModerationReport = {
  id: string
  article_id: string
  reporter_id: string
  created_at: Date
  status: 'open' | 'reviewed'
}

export type ModerationEventName = 'content.article.hidden' | 'content.article.restored' | 'content.article.deleted'

/** Порт хранилища модерации: чтение очередей и записи статуса внутри транзакции сервиса. */
export type ModerationRepositoryPort<TTx> = {
  transaction: <T>(work: (tx: TTx) => Promise<T>) => Promise<T>
  listReports: (limit: number, filters: ModerationFilters, cursor: ModerationCursor | null) => Promise<Array<ModerationArticle & { report: ModerationReport }>>
  list: (
    filter: ModerationListFilter,
    limit: number,
    filters: ModerationFilters,
    cursor: ModerationCursor | null,
  ) => Promise<{ articles: ModerationArticle[]; reports: ModerationReport[] }>
  find: (id: string) => Promise<StoredArticle | null>
  /** Строка статьи под `FOR UPDATE`: решение по жалобе не гоняется с другим модератором. */
  lockArticle: (tx: TTx, id: string) => Promise<StoredArticle | null>
  setStatus: (tx: TTx, id: string, status: StoredArticle['status']) => Promise<StoredArticle | null>
  lockReport: (tx: TTx, id: string) => Promise<ModerationReport | null>
  markReviewed: (tx: TTx, id: string) => Promise<ModerationReport | null>
}

export type ModerationArticleEventsPort<TTx> = {
  appendEvent: (
    tx: TTx,
    name: ModerationEventName | 'content.article.updated',
    row: StoredArticle,
    correlation_id: string,
    moderator_id?: string,
  ) => Promise<void>
}

export type ModerationCoversPort<TTx> = {
  requestArticleCover: (tx: TTx, article_id: string, correlation_id: string) => Promise<void>
}
