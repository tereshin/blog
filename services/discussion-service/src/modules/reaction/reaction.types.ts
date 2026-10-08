import type { ArticleAccessFields, CreateReaction, ReactionKind, ReactionResponse, ServiceContext } from '@blog/contracts'

export type ReactionTarget = {
  target_type: CreateReaction['target_type']
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

export type CommitReaction = {
  user_id: string
  target: ReactionTarget
  kind: ReactionKind
  idempotency_key: string | null
  correlation_id: string
}

export type ReactionRepository = {
  findTarget: (target_type: CreateReaction['target_type'], target_id: string) => Promise<ReactionTarget | null>
  commit: (input: CommitReaction) => Promise<ReactionResponse>
}
