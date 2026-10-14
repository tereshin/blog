import { appendToOutbox, newEventId } from '@blog/broker'
import type { Database } from '@blog/broker'
import { SocialCoverRequestedV1 } from '@blog/contracts'
import type { CoverRequest } from './social-cover.types.ts'

export async function appendSocialCoverRequested(tx: Database, request: CoverRequest): Promise<void> {
  await appendToOutbox(tx, SocialCoverRequestedV1.parse({
    event_id: newEventId(), name: 'content.social_cover.requested', version: 1,
    occurred_at: new Date().toISOString(), correlation_id: request.correlation_id, causation_id: null,
    target_id: request.target_id, revision: request.revision, input: request.input,
  }))
}
