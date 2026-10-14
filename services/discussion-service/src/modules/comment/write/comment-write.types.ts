import type { ArticleStatus, ArticleVisibility, ReactionKind } from '@blog/contracts'
import type { ArticleCounterSnapshot } from '../../article-snapshot/index.ts'
import type { CommentRow, CommentStatus } from '../comment.tree.ts'

export type WriteArticle = {
  author_id: string
  visibility: ArticleVisibility
  status: ArticleStatus
  comments_enabled: boolean
}

export type WriteComment = {
  id: string
  article_id: string
  author_id: string
  parent_id: string | null
  status: CommentStatus
  edited_at: Date | null
}

export type NewComment = {
  id: string
  article_id: string
  author_id: string
  parent_id: string | null
  body: string
  media: { url: string; alt: string }[]
  mentions: { user_id: string; display_name: string }[]
}

export type CommentReportRecord = {
  id: string
  comment_id: string
  reporter_id: string
  reason: string
  status: 'open' | 'reviewed'
  created_at: Date
}

export type ReviewReportInput = {
  id: string
  moderator_id: string
  action: 'dismiss' | 'hide' | 'delete'
  correlation_id: string
}

/** Файл из media-service: владелец и вид загрузки. */
export type LookupFile = (url: string) => Promise<{ uploader_id: string; kind: string } | null>

export type CommentWriteRepositoryPort<TTx> = {
  transaction: <TResult>(work: (tx: TTx) => Promise<TResult>) => Promise<TResult>
  lock: (tx: TTx, key: string) => Promise<void>
  findStoredResponse: (tx: TTx, user_id: string, idempotency_key: string) => Promise<unknown>
  saveResponse: (tx: TTx, user_id: string, idempotency_key: string, response: unknown) => Promise<void>
  findArticle: (tx: TTx, article_id: string) => Promise<WriteArticle | null>
  findComment: (tx: TTx, comment_id: string) => Promise<WriteComment | null>
  /** Строка комментария под `FOR UPDATE` до конца транзакции. */
  lockComment: (tx: TTx, comment_id: string) => Promise<WriteComment | null>
  findActiveUsers: (tx: TTx, user_ids: readonly string[]) => Promise<{ user_id: string; display_name: string | null }[]>
  /** `only_user_id` сужает подписчиков до одного участника. */
  listSubscriberIds: (tx: TTx, article_id: string, only_user_id: string | null) => Promise<string[]>
  insertComment: (tx: TTx, comment: NewComment) => Promise<void>
  updateBody: (tx: TTx, comment_id: string, body: string, edited_at: Date) => Promise<void>
  setStatus: (tx: TTx, comment_id: string, status: CommentStatus) => Promise<void>
  recountReplies: (tx: TTx, parent_id: string) => Promise<void>
  loadRows: (tx: TTx, ids: readonly string[]) => Promise<CommentRow[]>
  countReactions: (tx: TTx, ids: readonly string[]) => Promise<{ target_id: string; kind: ReactionKind; total: number }[]>
  findMine: (tx: TTx, user_id: string, ids: readonly string[]) => Promise<{ target_id: string; kind: ReactionKind }[]>
  lockReport: (tx: TTx, report_id: string) => Promise<CommentReportRecord | null>
  markReportReviewed: (tx: TTx, report_id: string, moderator_id: string, reviewed_at: Date) => Promise<void>
}

/** Счётчики статьи считает article-snapshot в транзакции записи. */
export type ArticleCountersPort<TTx> = {
  loadCounters: (tx: TTx, article_id: string) => Promise<ArticleCounterSnapshot>
}

type Envelope = { correlation_id: string; occurred_at: string }

export type CommentCreatedInput = Envelope & {
  snapshot: ArticleCounterSnapshot
  comment_id: string
  author_id: string
  parent_id: string | null
  parent_author_id: string | null
  article_author_id: string
  mention_ids?: string[]
  subscriber_ids?: string[]
  excerpt: string
}

export type CommentUpdatedInput = Envelope & {
  snapshot: ArticleCounterSnapshot
  comment_id: string
  status: CommentStatus
  edited_at: string | null
}

export type CommentHiddenInput = Envelope & {
  comment_id: string
  article_id: string
  author_id: string
  moderator_id: string
}

export type CommentEventsPort<TTx> = {
  appendCreated: (tx: TTx, input: CommentCreatedInput) => Promise<void>
  appendUpdated: (tx: TTx, input: CommentUpdatedInput) => Promise<void>
  appendHidden: (tx: TTx, input: CommentHiddenInput) => Promise<void>
}
