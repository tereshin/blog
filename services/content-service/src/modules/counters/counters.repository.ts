import { eq } from 'drizzle-orm'
import type { ArticleCountersUpdatedV1, ReputationUpdatedV1 } from '@blog/contracts'
import type { Database } from '@blog/broker'
import { articles, profiles } from '../../infra/db/schema.ts'

export const countersRepository = {
  async applyArticle(tx: Database, event: ArticleCountersUpdatedV1): Promise<void> {
    await tx
      .update(articles)
      .set({
        reaction_counts: event.reaction_counts,
        reaction_count: event.reaction_count,
        comment_count: event.comment_count,
        view_count: event.view_count,
        bookmark_count: event.bookmark_count,
        top_comment: event.top_comment,
      })
      .where(eq(articles.id, event.article_id))
  },

  async applyReputation(tx: Database, event: ReputationUpdatedV1): Promise<void> {
    await tx.update(profiles).set({ reputation: event.reputation }).where(eq(profiles.user_id, event.user_id))
  },
}
