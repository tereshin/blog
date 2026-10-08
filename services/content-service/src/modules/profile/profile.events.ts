import { ProfileUpdatedV1 } from '@blog/contracts'
import { appendToOutbox, newEventId } from '@blog/broker'
import type { Database } from '@blog/broker'

export async function appendProfileUpdated(
  tx: Database,
  input: { user_id: string; display_name: string; avatar_url: string | null; slug: string | null; correlation_id: string },
): Promise<void> {
  await appendToOutbox(
    tx,
    ProfileUpdatedV1.parse({
      event_id: newEventId(),
      name: 'content.profile.updated',
      occurred_at: new Date().toISOString(),
      correlation_id: input.correlation_id,
      causation_id: null,
      version: 1,
      user_id: input.user_id,
      display_name: input.display_name,
      avatar_url: input.avatar_url,
      slug: input.slug,
    }),
  )
}
