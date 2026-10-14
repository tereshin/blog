import type { ReactionKind } from '@blog/contracts'

export type ViewerArticleMarks = {
  reaction_by_article_id: Map<string, ReactionKind>
  bookmarked_article_ids: Set<string>
}

export type ArticleStateRepositoryPort = {
  findViewerMarks: (user_id: string, article_ids: readonly string[]) => Promise<ViewerArticleMarks>
}
