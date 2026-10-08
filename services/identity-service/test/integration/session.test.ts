import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { errorHandler, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { sessions, users } from '../../src/infra/db/schema.ts'
import { sessionRoutes } from '../../src/modules/session/index.ts'

const MEMBER = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const RESTRICTED = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99'
const HOUR = 60 * 60 * 1000

describe('identity: миграция и GET /internal/sessions/{id} (PostgreSQL в контейнере)', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)

    await database.db.insert(users).values([
      { id: MEMBER, email: 'member@blog.test', google_sub: 'sub-member', role: 'member', can_publish: true },
      { id: RESTRICTED, email: 'restricted@blog.test', google_sub: 'sub-restricted', role: 'admin', can_publish: false, restricted_at: new Date() },
    ])
    const now = Date.now()
    await database.db.insert(sessions).values([
      { id: 'active_session_00000001', user_id: MEMBER, expires_at: new Date(now + HOUR) },
      { id: 'expired_session_0000001', user_id: MEMBER, expires_at: new Date(now - HOUR) },
      { id: 'revoked_session_0000001', user_id: MEMBER, expires_at: new Date(now + HOUR), revoked_at: new Date() },
      { id: 'restricted_session_00001', user_id: RESTRICTED, expires_at: new Date(now + HOUR) },
    ])

    const logger = createLogger({ service: 'identity-test', level: 'silent' })
    app = Fastify()
    await app.register(requestContext, { logger })
    await app.register(errorHandler)
    await app.register(sessionRoutes, { database })
  }, 120_000)

  afterAll(async () => {
    await app.close()
    await database.close()
    await postgres.stop()
  })

  it('миграция создаёт таблицы сервиса и повторный запуск ничего не меняет', async () => {
    expect(await migrate(database.pool)).toEqual([])
    const { rows } = await database.pool.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
    )
    expect(rows.map((row) => row.table_name)).toEqual(
      expect.arrayContaining(['users', 'sessions', 'settings_copy', 'outbox', 'processed_events', 'seed_runs', 'schema_migrations']),
    )
  })

  it('public_number выдаётся автоматически и уникален', async () => {
    const { rows } = await database.pool.query<{ public_number: number }>('select public_number from users order by public_number')
    expect(rows.map((row) => row.public_number)).toEqual([1, 2])
  })

  it('действующая сессия отдаёт участника', async () => {
    const response = await app.inject({ method: 'GET', url: '/internal/sessions/active_session_00000001' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ user_id: MEMBER, role: 'member', is_restricted: false, can_publish: true })
  })

  it('ограниченный участник отдаётся с is_restricted', async () => {
    const response = await app.inject({ method: 'GET', url: '/internal/sessions/restricted_session_00001' })
    expect(response.json()).toEqual({ user_id: RESTRICTED, role: 'admin', is_restricted: true, can_publish: false })
  })

  it.each(['expired_session_0000001', 'revoked_session_0000001', 'unknown_session_000000001'])('сессия %s — 404', async (id) => {
    const response = await app.inject({ method: 'GET', url: `/internal/sessions/${id}` })
    expect(response.statusCode).toBe(404)
    expect(response.headers['content-type']).toMatch(/application\/problem\+json/)
  })

  it('идентификатор вне алфавита отвергается до обращения к базе', async () => {
    const response = await app.inject({ method: 'GET', url: '/internal/sessions/short' })
    expect(response.statusCode).toBe(422)
  })
})
