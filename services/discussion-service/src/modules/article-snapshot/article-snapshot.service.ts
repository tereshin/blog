import { sumReactionCounts } from '@blog/contracts'
import type { ReactionCounts } from '@blog/contracts'
import type { ArticleCounterSnapshot, ArticleSnapshotRepositoryPort } from './article-snapshot.types.ts'

export class ArticleSnapshotService<TTx> {
  constructor(private readonly repository: ArticleSnapshotRepositoryPort<TTx>) {}

  /**
   * Снимок счётчиков статьи из таблиц обсуждения. Вызывается в той же транзакции, что и изменение,
   * поэтому числа уже включают только что записанную реакцию или закладку.
   */
  async loadCounters(tx: TTx, article_id: string): Promise<ArticleCounterSnapshot> {
    const reaction_counts: ReactionCounts = {}
    for (const row of await this.repository.countReactionKinds(tx, article_id)) reaction_counts[row.kind] = row.total
    const comment_count = await this.repository.countThreadComments(tx, article_id)
    const top_comment = await this.repository.findTopComment(tx, article_id)
    return {
      article_id,
      reaction_counts,
      reaction_count: sumReactionCounts(reaction_counts),
      comment_count,
      view_count: await this.repository.sumViews(tx, article_id),
      bookmark_count: await this.repository.countBookmarks(tx, article_id),
      top_comment,
    }
  }
}
