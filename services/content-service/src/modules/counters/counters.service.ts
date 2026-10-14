import type { ArticleCountersUpdatedV1, ReputationUpdatedV1 } from '@blog/contracts'
import type { CountersRepositoryPort } from './counters.types.ts'

type CountersTx = Parameters<CountersRepositoryPort['applyArticle']>[0]

export class CountersService {
  constructor(
    private readonly repository: CountersRepositoryPort,
    private readonly badges: { evaluate: (tx: CountersTx, user_id: string) => Promise<void> },
  ) {}

  applyArticle(tx: CountersTx, event: ArticleCountersUpdatedV1) {
    return this.repository.applyArticle(tx, event)
  }

  async applyReputation(tx: CountersTx, event: ReputationUpdatedV1) {
    await this.repository.applyReputation(tx, event)
    await this.badges.evaluate(tx, event.user_id)
  }
}
