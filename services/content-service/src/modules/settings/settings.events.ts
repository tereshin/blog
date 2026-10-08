import { SettingsUpdatedV1 } from '@blog/contracts'
import { appendToOutbox, newEventId } from '@blog/broker'
import type { Database } from '@blog/broker'

export async function appendSettingsUpdated(
  tx: Database,
  input: {
    name: string
    logo_url: string | null
    locale: 'ru' | 'en' | 'sr'
    registration_open: boolean
    new_members_can_publish: boolean
    correlation_id: string
  },
): Promise<void> {
  await appendToOutbox(
    tx,
    SettingsUpdatedV1.parse({
      event_id: newEventId(),
      name: 'content.settings.updated',
      occurred_at: new Date().toISOString(),
      correlation_id: input.correlation_id,
      causation_id: null,
      version: 1,
      site_name: input.name,
      logo_url: input.logo_url,
      locale: input.locale,
      registration_open: input.registration_open,
      new_members_can_publish: input.new_members_can_publish,
    }),
  )
}
