import { createIdempotentConsumer } from '@blog/broker'
import type { BrokerClient, Database, EventHandler, RunningConsumer } from '@blog/broker'
import type { Logger } from '@blog/logger'
import type { SocialCoverService } from './social-cover.service.ts'

export type SocialCoverConsumerDeps = { db: Database; broker: BrokerClient; logger: Logger }

export class SocialCoverConsumer {
  constructor(private readonly service: SocialCoverService<Database>) {}

  readonly handle: EventHandler = (tx, event) => this.service.applyGenerated(tx, event)

  start(deps: SocialCoverConsumerDeps): Promise<RunningConsumer> {
    return createIdempotentConsumer({ ...deps, durable: 'content-social-covers', subject: 'media.social_cover.generated', handler: this.handle })
  }
}
