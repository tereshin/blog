import { createIdempotentConsumer } from '@blog/broker'
import type { BrokerClient, Database, OutboxEvent, RunningConsumer } from '@blog/broker'
import { SocialCoverRequestedV1 } from '@blog/contracts'
import type { Logger } from '@blog/logger'
import type { CoverJobsRepositoryPort } from './social-cover.types.ts'

export type SocialCoverConsumerDeps = { db: Database; broker: BrokerClient; logger: Logger }

/** Запрос обложки ставит задачу в очередь в транзакции потребителя; рендер идёт вне её. */
export class SocialCoverConsumer {
  constructor(private readonly repository: CoverJobsRepositoryPort<Database>) {}

  readonly handle = async (tx: Database, event: OutboxEvent): Promise<void> => {
    await this.repository.enqueue(tx, SocialCoverRequestedV1.parse(event))
  }

  start(deps: SocialCoverConsumerDeps): Promise<RunningConsumer> {
    return createIdempotentConsumer({ ...deps, durable: 'media-social-covers', subject: 'content.social_cover.requested', handler: this.handle })
  }
}
