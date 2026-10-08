import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { newEventId, processEvent } from '@blog/broker'
import type { OutboxEvent } from '@blog/broker'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { settings_copy } from '../../src/infra/db/schema.ts'
import { SETTINGS_COPY_CONSUMER, createSettingsCopyHandler } from '../../src/modules/settings-copy/index.ts'

function event(patch: Record<string, unknown> = {}): OutboxEvent {
  return {
    event_id: newEventId(),
    name: 'content.settings.updated',
    occurred_at: '2026-10-08T10:00:00.000Z',
    correlation_id: 'test',
    causation_id: null,
    version: 1,
    site_name: 'Блог',
    logo_url: null,
    locale: 'ru',
    registration_open: false,
    new_members_can_publish: false,
    ...patch,
  }
}

describe('identity: копия настроек регистрации', () => {
  let postgres: TestPostgres
  let database: DbHandle
  const handler = createSettingsCopyHandler()
  const apply = (item: OutboxEvent) => processEvent(database.db, SETTINGS_COPY_CONSUMER, item, handler)

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
  }, 120_000)

  afterAll(async () => {
    await database.close()
    await postgres.stop()
  })

  it('записывает флаги и повтор того же события ничего не меняет', async () => {
    const first = event()
    expect(await apply(first)).toBe('ok')
    expect(await apply(first)).toBe('duplicate')
    const [row] = await database.db.select().from(settings_copy).where(eq(settings_copy.id, 1))
    expect(row).toMatchObject({ registration_open: false, new_members_can_publish: false })

    const next = event({ registration_open: true })
    expect(await apply(next)).toBe('ok')
    const [updated] = await database.db.select().from(settings_copy).where(eq(settings_copy.id, 1))
    expect(updated?.registration_open).toBe(true)
  })
})
