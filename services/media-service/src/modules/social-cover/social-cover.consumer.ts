import { createIdempotentConsumer } from '@blog/broker'
import type { BrokerClient, Database, EventHandler, RunningConsumer } from '@blog/broker'
import { SocialCoverRequestedV1 } from '@blog/contracts'
import type { Logger } from '@blog/logger'
import type { CoverJobsRepository } from './social-cover.repository.ts'

export function createCoverRequestedHandler(repository: CoverJobsRepository): EventHandler {
  return async (tx, event) => { await repository.enqueue(tx, SocialCoverRequestedV1.parse(event)) }
}
export function startCoverRequestedConsumer(deps: { db: Database; broker: BrokerClient; logger: Logger; repository: CoverJobsRepository }): Promise<RunningConsumer> {
  return createIdempotentConsumer({ ...deps, durable: 'media-social-covers', subject: 'content.social_cover.requested', handler: createCoverRequestedHandler(deps.repository) })
}
