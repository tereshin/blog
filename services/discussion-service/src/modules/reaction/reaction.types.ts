import type { ArticleAccessFields, CreateReaction, ReactionCounts, ReactionKind, ServiceContext } from '@blog/contracts'
import type { ArticleCounterSnapshot } from '../article-snapshot/index.ts'

export type ReactionTargetType = CreateReaction['target_type']

export type ReactionTarget = {
  target_type: ReactionTargetType
  target_id: string
  article_id: string
  author_id: string
  access: ArticleAccessFields
  comment_status: 'visible' | 'deleted' | 'hidden' | null
}

export type ReactInput = {
  viewer: ServiceContext
  body: CreateReaction
  idempotency_key: string | null
  correlation_id: string
}

/** Строка реакции участника на объект. */
export type ReactionKey = { user_id: string; target_type: ReactionTargetType; target_id: string }

export type ReactionRepositoryPort<TTx> = {
  findTarget: (target_type: ReactionTargetType, target_id: string) => Promise<ReactionTarget | null>
  transaction: <TResult>(work: (tx: TTx) => Promise<TResult>) => Promise<TResult>
  lock: (tx: TTx, key: string) => Promise<void>
  findStoredResponse: (tx: TTx, user_id: string, idempotency_key: string) => Promise<unknown>
  saveResponse: (tx: TTx, user_id: string, idempotency_key: string, response: unknown) => Promise<void>
  findKind: (tx: TTx, key: ReactionKey) => Promise<ReactionKind | null>
  insertReaction: (tx: TTx, key: ReactionKey, kind: ReactionKind) => Promise<void>
  updateKind: (tx: TTx, key: ReactionKey, kind: ReactionKind) => Promise<void>
  deleteReaction: (tx: TTx, key: ReactionKey) => Promise<void>
  countKinds: (tx: TTx, target_type: ReactionTargetType, target_id: string) => Promise<ReactionCounts>
  setCommentReactionCount: (tx: TTx, comment_id: string, reaction_count: number) => Promise<void>
}

export type ReactionCatalogPort<TTx> = {
  isActiveKind: (tx: TTx, kind: string) => Promise<boolean>
}

export type ArticleCountersPort<TTx> = {
  loadCounters: (tx: TTx, article_id: string) => Promise<ArticleCounterSnapshot>
}

export type ReputationPort<TTx> = {
  recompute: (tx: TTx, user_id: string) => Promise<number>
}

export type ReactionEventsInput = {
  correlation_id: string
  occurred_at: string
  snapshot: ArticleCounterSnapshot
  placed: boolean
  target_type: ReactionTargetType
  target_id: string
  article_id: string
  actor_id: string
  target_author_id: string
  kind: ReactionKind
  reputation: number
}

export type ReactionEventsPort<TTx> = {
  appendReactionEvents: (tx: TTx, input: ReactionEventsInput) => Promise<void>
}
