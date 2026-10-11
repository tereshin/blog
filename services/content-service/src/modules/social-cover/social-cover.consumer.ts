import { and, eq, sql } from 'drizzle-orm'
import { createIdempotentConsumer } from '@blog/broker'
import type { BrokerClient, Database, EventHandler, RunningConsumer } from '@blog/broker'
import { SocialCoverGeneratedV1 } from '@blog/contracts'
import type { Logger } from '@blog/logger'
import { articles, social_covers } from '../../infra/db/schema.ts'

export const applyGeneratedCover: EventHandler = async (tx, event) => {
  const result = SocialCoverGeneratedV1.parse(event)
  // The version and guest visibility are checked in the same write; stale jobs cannot revive a hidden cover.
  await tx.update(social_covers).set({ images: result.images }).where(and(
    eq(social_covers.target_id, result.target_id), eq(social_covers.revision, result.revision),
    result.target_id === 'site' ? undefined : sql`exists (select 1 from ${articles} where ${articles.id}::text = ${result.target_id} and ${articles.status} = 'published' and ${articles.visibility} = 'public')`,
  ))
}

export function startSocialCoverConsumer(deps: { db: Database; broker: BrokerClient; logger: Logger }): Promise<RunningConsumer> {
  return createIdempotentConsumer({ ...deps, durable: 'content-social-covers', subject: 'media.social_cover.generated', handler: applyGeneratedCover })
}
