import { BadgeRepository, BadgeService } from '../badge/index.ts'
import { CountersService } from './counters.service.ts'
import { createIdempotentConsumer } from '@blog/broker'
import type { BrokerClient, Database, EventHandler, RunningConsumer } from '@blog/broker'
import { ArticleCountersUpdatedV1, ReputationUpdatedV1 } from '@blog/contracts'
import type { Logger } from '@blog/logger'
import { CountersRepository } from './counters.repository.ts'

export class CountersHandler {
  constructor(private readonly repository: CountersRepository = new CountersRepository()) {}

  handle: EventHandler = async (tx, event) => {
    const service = new CountersService(this.repository, new BadgeService(new BadgeRepository()))
    switch (event.name) {
      case 'discussion.article_counters.updated':
        await service.applyArticle(tx, ArticleCountersUpdatedV1.parse(event))
        return
      case 'discussion.reputation.updated':
        await service.applyReputation(tx, ReputationUpdatedV1.parse(event))
        return
      default:
        return
    }
  }
}

export type CountersConsumerDeps = { db: Database; broker: BrokerClient; logger: Logger }

export async function startCountersConsumers(
  deps: CountersConsumerDeps,
): Promise<RunningConsumer[]> {
  const handler = new CountersHandler().handle
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
