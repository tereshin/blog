import { createIdempotentConsumer } from '@blog/broker'
import type { BrokerClient, Database, EventHandler, RunningConsumer } from '@blog/broker'
import { SettingsUpdatedV1 } from '@blog/contracts'
import type { Logger } from '@blog/logger'
import type { ReactionCatalogService } from './reaction-catalog.service.ts'

export type ReactionCatalogConsumerDeps = { db: Database; broker: BrokerClient; logger: Logger }

/** Копирует активные виды из `content.settings.updated`. */
export class ReactionCatalogConsumer {
  constructor(private readonly service: ReactionCatalogService<Database>) {}

  readonly handle: EventHandler = async (tx, event) => {
    if (event.name !== 'content.settings.updated') return
    const parsed = SettingsUpdatedV1.parse(event)
    await this.service.applyAppearances(tx, parsed.reaction_appearances)
  }

  start(deps: ReactionCatalogConsumerDeps): Promise<RunningConsumer> {
    return createIdempotentConsumer({
      ...deps,
      durable: 'discussion-reaction-catalog',
      subject: 'content.settings.updated',
      handler: this.handle,
    })
  }
}
