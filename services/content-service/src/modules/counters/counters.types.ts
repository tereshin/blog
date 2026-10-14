import type { ArticleCountersUpdatedV1, ReputationUpdatedV1 } from '@blog/contracts'
import type { Database } from '@blog/broker'

export type CountersRepositoryPort = {
  applyArticle: (tx: Database, event: ArticleCountersUpdatedV1) => Promise<void>
  applyReputation: (tx: Database, event: ReputationUpdatedV1) => Promise<void>
}
