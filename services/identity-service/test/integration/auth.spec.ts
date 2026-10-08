import { createServer } from 'node:net'
import type { AddressInfo } from 'node:net'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { errorHandler, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { buildApp as buildMockGoogle } from '../../../../infra/mock-google/src/app.ts'
import { loadEnv as loadMockEnv } from '../../../../infra/mock-google/src/config/env.ts'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { outbox, sessions, settings_copy, users } from '../../src/infra/db/schema.ts'
import { authRoutes } from '../../src/modules/auth/index.ts'
import { sessionRoutes } from '../../src/modules/session/index.ts'
import type { Env } from '../../src/config/env.ts'

const CLIENT_ID = 'test-client'
const CLIENT_SECRET = 'test-secret'
const SUPERADMIN_EMAIL = 'root@example.test'
const REDIRECT_URI = 'http://identity.test/v1/auth/google/callback'

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo
      server.close(() => resolve(port))
    })
  })
}

async function pickParticipant(authorize_url: URL, participant: string): Promise<URL> {
  const form = new URLSearchParams([...authorize_url.searchParams.entries(), ['participant', participant]])
  const picked = await fetch(authorize_url.origin + '/authorize', { method: 'POST', body: form, redirect: 'manual' })
  expect(picked.status).toBe(302)
  return new URL(picked.headers.get('location') ?? '')
}

describe('identity: вход через mock-google', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance
  let google: FastifyInstance

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    await database.db.insert(settings_copy).values({ id: 1, registration_open: false, new_members_can_publish: false })

    const port = await freePort()
    const issuer = `http://127.0.0.1:${port}`
    google = await buildMockGoogle(
      loadMockEnv({
        APP_ENV: 'local',
        HTTP_PORT: String(port),
        ISSUER_URL: issuer,
        CLIENT_ID,
        CLIENT_SECRET,
        REDIRECT_URI,
        SUPERADMIN_EMAIL,
      }),
      { quiet: true },
    )
    await google.listen({ host: '127.0.0.1', port })

    const env = {
      APP_ENV: 'local',
      GOOGLE_ISSUER_URL: issuer,
      GOOGLE_CLIENT_ID: CLIENT_ID,
      GOOGLE_CLIENT_SECRET: CLIENT_SECRET,
      GOOGLE_REDIRECT_URI: REDIRECT_URI,
      SUPERADMIN_EMAIL,
      SESSION_TTL_DAYS: 30,
    } as Env

    app = Fastify()
    await app.register(requestContext, { logger: createLogger({ service: 'identity-test', level: 'silent' }) })
    await app.register(errorHandler)
    await app.register(sessionRoutes, { database })
    await app.register(authRoutes, { database, env })
  }, 120_000)

  afterAll(async () => {
    await app.close()
    await google.close()
    await database.close()
    await postgres.stop()
  })

  async function login(participant: string, return_to = '/feed') {
    const start = await app.inject({ method: 'GET', url: `/v1/auth/google?return_to=${encodeURIComponent(return_to)}` })
    expect(start.statusCode).toBe(302)
    const callback = await pickParticipant(new URL(start.headers.location ?? ''), participant)
    return app.inject({ method: 'GET', url: `${callback.pathname}${callback.search}` })
  }

  it('закрытая регистрация отклоняет новую почту и не создаёт участника', async () => {
    const response = await login('newcomer')
    expect(response.statusCode).toBe(403)
    expect(response.json()).toMatchObject({ error: 'registration_closed', return_to: '/feed' })
    const rows = await database.db.select().from(users)
    expect(rows).toHaveLength(0)
  })

  it('почта суперадминистратора входит при закрытой регистрации', async () => {
    const response = await login('superadmin', '/admin')
    expect(response.statusCode).toBe(200)
    const body = response.json<{ session_id: string; return_to: string }>()
    expect(body.return_to).toBe('/admin')
    const [row] = await database.db.select().from(users).where(eq(users.email, SUPERADMIN_EMAIL))
    expect(row).toMatchObject({ role: 'superadmin', google_sub: 'seed-sub-superadmin', can_publish: true })
    const session = await app.inject({ method: 'GET', url: `/internal/sessions/${body.session_id}` })
    expect(session.statusCode).toBe(200)
  })

  it('привязывает sub к строке без google_sub и поднимает суперадминистратора', async () => {
    await database.db.delete(sessions)
    await database.db.delete(users)
    await database.db.insert(users).values({
      id: '33333333-3333-4333-8333-333333333333',
      email: SUPERADMIN_EMAIL,
      role: 'member',
      can_publish: false,
      google_sub: null,
    })
    const response = await login('superadmin', '/back')
    expect(response.statusCode).toBe(200)
    const [row] = await database.db.select().from(users).where(eq(users.id, '33333333-3333-4333-8333-333333333333'))
    expect(row).toMatchObject({ google_sub: 'seed-sub-superadmin', role: 'superadmin', can_publish: true })
  })

  it('повторный вход по sub обновляет почту и не плодит учётные записи', async () => {
    await database.db.update(settings_copy).set({ registration_open: true, new_members_can_publish: true })
    const first = await login('reader', '/u/1')
    expect(first.statusCode).toBe(200)
    const before = await database.db.select().from(users).where(eq(users.google_sub, 'seed-sub-reader'))
    expect(before).toHaveLength(1)
    await database.db.update(users).set({ email: 'old-reader@blog.test' }).where(eq(users.google_sub, 'seed-sub-reader'))

    const second = await login('reader')
    expect(second.statusCode).toBe(200)
    const after = await database.db.select().from(users).where(eq(users.google_sub, 'seed-sub-reader'))
    expect(after).toHaveLength(1)
    expect(after[0]?.email).toBe('reader@blog.test')
  })

  it('выход отзывает сессию и пишет событие', async () => {
    const response = await login('reader')
    const session_id = response.json<{ session_id: string }>().session_id
    const logout = await app.inject({ method: 'POST', url: '/v1/auth/logout', headers: { 'x-session-id': session_id } })
    expect(logout.statusCode).toBe(204)
    const again = await app.inject({ method: 'GET', url: `/internal/sessions/${session_id}` })
    expect(again.statusCode).toBe(404)
    const events = await database.db.select().from(outbox).where(eq(outbox.name, 'identity.session.revoked'))
    expect(events.length).toBeGreaterThan(0)
    const [row] = await database.db.select().from(sessions).where(eq(sessions.id, session_id))
    expect(row?.revoked_at).toBeInstanceOf(Date)
  })

  it('ограниченный участник не получает сессию', async () => {
    await database.db.insert(users).values({
      id: '44444444-4444-4444-8444-444444444444',
      email: 'restricted@blog.test',
      google_sub: 'seed-sub-restricted',
      role: 'member',
      restricted_at: new Date(),
    })
    const response = await login('restricted')
    expect(response.statusCode).toBe(403)
    expect(response.json()).toMatchObject({ error: 'restricted' })
  })
})
