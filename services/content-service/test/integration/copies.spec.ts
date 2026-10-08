import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { newEventId, processEvent } from '@blog/broker'
import type { OutboxEvent } from '@blog/broker'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { profiles, users_copy } from '../../src/infra/db/schema.ts'
import { createCopiesHandler } from '../../src/modules/copies/index.ts'

const USER = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const CONSUMER = 'test-copies'

function event(name: string, payload: Record<string, unknown>): OutboxEvent {
  return { event_id: newEventId(), name, occurred_at: '2026-10-08T10:00:00.000Z', correlation_id: 'test', causation_id: null, version: 1, ...payload }
}

const snapshot = { user_id: USER, public_number: 7, role: 'member', can_publish: true, is_restricted: false, created_at: '2026-01-01T00:00:00.000Z' }

describe('content: копии участников из событий (PostgreSQL в контейнере)', () => {
  let postgres: TestPostgres
  let database: DbHandle
  const handler = createCopiesHandler()
  const apply = (e: OutboxEvent) => processEvent(database.db, CONSUMER, e, handler)
  const readUser = async () => (await database.db.select().from(users_copy).where(eq(users_copy.user_id, USER)))[0]
  const readProfile = async () => (await database.db.select().from(profiles).where(eq(profiles.user_id, USER)))[0]

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
  }, 120_000)

  afterAll(async () => {
    await database.close()
    await postgres.stop()
  })

  it('identity.user.created создаёт копию и профиль с именем из события', async () => {
    const created = event('identity.user.created', { ...snapshot, display_name: 'Мария' })
    expect(await apply(created)).toBe('ok')
    expect(await readUser()).toMatchObject({ public_number: 7, role: 'member', can_publish: true, is_restricted: false })
    expect((await readUser())?.created_at.toISOString()).toBe('2026-01-01T00:00:00.000Z')
    expect(await readProfile()).toMatchObject({ display_name: 'Мария', slug: null, reputation: 0 })
  })

  it('событие дважды — эффект один', async () => {
    const created = event('identity.user.created', { ...snapshot, user_id: '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99', public_number: 8, display_name: 'Пётр' })
    expect(await apply(created)).toBe('ok')
    expect(await apply(created)).toBe('duplicate')
    expect((await database.db.select().from(users_copy)).filter((row) => row.public_number === 8)).toHaveLength(1)
  })

  it('updated и restricted меняют копию, имя в профиле не трогают', async () => {
    await database.db.update(profiles).set({ display_name: 'Мария Иванова' }).where(eq(profiles.user_id, USER))
    await apply(event('identity.user.updated', { ...snapshot, role: 'admin', can_publish: false }))
    expect(await readUser()).toMatchObject({ role: 'admin', can_publish: false, is_restricted: false })
    await apply(event('identity.user.restricted', { ...snapshot, role: 'admin', can_publish: false, is_restricted: true }))
    expect((await readUser())?.is_restricted).toBe(true)
    expect((await readProfile())?.display_name).toBe('Мария Иванова')
  })

  it('повторное created не затирает имя, которое человек задал сам', async () => {
    await apply(event('identity.user.created', { ...snapshot, display_name: 'Другое имя' }))
    expect((await readProfile())?.display_name).toBe('Мария Иванова')
  })

  it('невалидное событие — ошибка, копия не меняется', async () => {
    const before = await readUser()
    await expect(apply(event('identity.user.updated', { user_id: USER }))).rejects.toThrow()
    expect(await readUser()).toEqual(before)
  })
})
