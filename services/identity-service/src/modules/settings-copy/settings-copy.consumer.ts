import { createIdempotentConsumer } from '@blog/broker'
import type { BrokerClient, Database, EventHandler, RunningConsumer } from '@blog/broker'
import { SettingsUpdatedV1 } from '@blog/contracts'
import type { Logger } from '@blog/logger'
import { settings_copy } from '../../infra/db/schema.ts'

export const SETTINGS_COPY_CONSUMER = 'identity-settings-copy'

/** Копирует флаги регистрации из content. Повтор того же события не меняет строку второй раз. */
export function createSettingsCopyHandler(): EventHandler {
  return async (tx, event) => {
    if (event.name !== 'content.settings.updated') return
    const parsed = SettingsUpdatedV1.parse(event)
    await tx
      .insert(settings_copy)
      .values({
        id: 1,
        registration_open: parsed.registration_open,
        new_members_can_publish: parsed.new_members_can_publish,
      })
      .onConflictDoUpdate({
        target: settings_copy.id,
        set: {
          registration_open: parsed.registration_open,
          new_members_can_publish: parsed.new_members_can_publish,
        },
      })
  }
}

export async function startSettingsCopyConsumer(deps: { db: Database; broker: BrokerClient; logger: Logger }): Promise<RunningConsumer> {
  return createIdempotentConsumer({
    ...deps,
    durable: SETTINGS_COPY_CONSUMER,
    subject: 'content.settings.updated',
    handler: createSettingsCopyHandler(),
  })
}
