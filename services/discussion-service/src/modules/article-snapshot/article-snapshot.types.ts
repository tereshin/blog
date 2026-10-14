import type { ArticleCountersUpdatedV1, ReactionKind } from '@blog/contracts'

export type ArticleCounterSnapshot = Pick<
  ArticleCountersUpdatedV1,
  'article_id' | 'reaction_counts' | 'reaction_count' | 'comment_count' | 'view_count' | 'bookmark_count' | 'top_comment'
>

export type TopComment = NonNullable<ArticleCounterSnapshot['top_comment']>

/** Порт чтения счётчиков: каждый метод выполняется в транзакции вызывающего модуля. */
export type ArticleSnapshotRepositoryPort<TTx> = {
  countReactionKinds: (tx: TTx, article_id: string) => Promise<Array<{ kind: ReactionKind; total: number }>>
  countThreadComments: (tx: TTx, article_id: string) => Promise<number>
  findTopComment: (tx: TTx, article_id: string) => Promise<TopComment | null>
  sumViews: (tx: TTx, article_id: string) => Promise<number>
  countBookmarks: (tx: TTx, article_id: string) => Promise<number>
}
