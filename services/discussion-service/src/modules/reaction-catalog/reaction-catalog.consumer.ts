import { createIdempotentConsumer } from '@blog/broker'
import type { BrokerClient, Database, EventHandler, RunningConsumer } from '@blog/broker'
import { SettingsUpdatedV1 } from '@blog/contracts'
import type { Logger } from '@blog/logger'
import { replaceActiveKinds } from './reaction-catalog.repository.ts'

/** Копирует активные виды из `content.settings.updated`. Конверт без каталога прежний набор не затирает. */
export function createReactionCatalogHandler(): EventHandler {
  return async (tx, event) => {
    if (event.name !== 'content.settings.updated') return
    const parsed = SettingsUpdatedV1.parse(event)
    if (!parsed.reaction_appearances) return
    const active = parsed.reaction_appearances.filter((item) => item.status === 'active').map((item) => item.kind)
    await replaceActiveKinds(tx, active)
  }
}

export type ReactionCatalogConsumerDeps = { db: Database; broker: BrokerClient; logger: Logger }

export async function startReactionCatalogConsumer(deps: ReactionCatalogConsumerDeps): Promise<RunningConsumer> {
  return createIdempotentConsumer({
    ...deps,
    durable: 'discussion-reaction-catalog',
    subject: 'content.settings.updated',
    handler: createReactionCatalogHandler(),
  })
}
