import { newEventId } from '@blog/broker'
import { SocialCoverGeneratedV1 } from '@blog/contracts'
import type { SocialImages } from '@blog/contracts'
import type { CoverJob } from './social-cover.types.ts'

export function socialCoverGeneratedEvent(job: CoverJob, images: SocialImages): SocialCoverGeneratedV1 {
  return SocialCoverGeneratedV1.parse({
    event_id: newEventId(),
    name: 'media.social_cover.generated',
    version: 1,
    occurred_at: new Date().toISOString(),
    correlation_id: job.event.correlation_id,
    causation_id: job.event.event_id,
    target_id: job.event.target_id,
    revision: job.event.revision,
    images,
  })
}
