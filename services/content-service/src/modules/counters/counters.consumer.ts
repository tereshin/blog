import { createIdempotentConsumer } from '@blog/broker'
import type { BrokerClient, Database, EventHandler, RunningConsumer } from '@blog/broker'
import { ArticleCountersUpdatedV1, ReputationUpdatedV1 } from '@blog/contracts'
import type { Logger } from '@blog/logger'
import { countersRepository } from './counters.repository.ts'

type CountersRepository = typeof countersRepository

/** Записывает счётчики из события целиком. Повтор того же события оставляет те же числа. */
export function createCountersHandler(repository: CountersRepository = countersRepository): EventHandler {
  return async (tx, event) => {
    switch (event.name) {
      case 'discussion.article_counters.updated':
        await repository.applyArticle(tx, ArticleCountersUpdatedV1.parse(event))
        return
      case 'discussion.reputation.updated':
        await repository.applyReputation(tx, ReputationUpdatedV1.parse(event))
        return
      default:
        return
    }
  }
}

export type CountersConsumerDeps = { db: Database; broker: BrokerClient; logger: Logger }

export async function startCountersConsumers(deps: CountersConsumerDeps): Promise<RunningConsumer[]> {
  const handler = createCountersHandler()
  const articles = await createIdempotentConsumer({
    ...deps,
    durable: 'content-counters-articles',
    subject: 'discussion.article_counters.updated',
    handler,
  })
  const reputation = await createIdempotentConsumer({
    ...deps,
    durable: 'content-counters-reputation',
    subject: 'discussion.reputation.updated',
    handler,
  })
  return [articles, reputation]
}
