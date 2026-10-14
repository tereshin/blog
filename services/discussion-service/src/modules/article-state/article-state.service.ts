import type { ArticleStates, ServiceContext } from '@blog/contracts'
import type { ArticleStateRepositoryPort } from './article-state.types.ts'

export class ArticleStateService {
  constructor(private readonly repository: ArticleStateRepositoryPort) {}

  async get(viewer: ServiceContext, article_ids: readonly string[]): Promise<ArticleStates> {
    if (viewer.user_id === undefined || article_ids.length === 0) return { states: {} }
    const marks = await this.repository.findViewerMarks(viewer.user_id, article_ids)
    const states: ArticleStates['states'] = {}
    for (const article_id of article_ids) {
      states[article_id] = {
        my_reaction: marks.reaction_by_article_id.get(article_id) ?? null,
        is_bookmarked: marks.bookmarked_article_ids.has(article_id),
      }
    }
    return { states }
  }
}
