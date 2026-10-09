import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { createSettingsRepository, createSettingsService } from '../../src/modules/settings/index.ts'

describe('content: bootstrap', () => {
  let postgres: TestPostgres
  let database: DbHandle

  const ensure = () => createSettingsService(createSettingsRepository(database.db), { media_url: 'http://localhost' }).ensureDefaults(randomUUID())

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
  }, 120_000)

  afterAll(async () => {
    await database.close()
    await postgres.stop()
  })

  it('создаёт настройки по умолчанию один раз и публикует одно событие', async () => {
    const first = await ensure()
    const second = await ensure()
    expect(first).toMatchObject({ name: 'Блог', locale: 'ru', registration_open: false, new_members_can_publish: true })
    expect(second).toMatchObject({ registration_open: false })
    expect(Number((await database.pool.query<{ n: string }>('select count(*) as n from settings')).rows[0]?.n)).toBe(1)
    const events = await database.pool.query<{ name: string; payload: { registration_open: boolean } }>('select name, payload from outbox')
    expect(events.rows).toHaveLength(1)
    expect(events.rows[0]?.name).toBe('content.settings.updated')
    expect(events.rows[0]?.payload.registration_open).toBe(false)
    expect(Number((await database.pool.query<{ n: string }>('select count(*) as n from topics')).rows[0]?.n)).toBe(0)
    expect(Number((await database.pool.query<{ n: string }>('select count(*) as n from articles')).rows[0]?.n)).toBe(0)
  })
})
