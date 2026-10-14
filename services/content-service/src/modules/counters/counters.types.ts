import type { ArticleCountersUpdatedV1, ReputationUpdatedV1 } from '@blog/contracts'

export type CountersRepository = {
  applyArticle: (event: ArticleCountersUpdatedV1) => Promise<void>
  applyReputation: (event: ReputationUpdatedV1) => Promise<void>
}
