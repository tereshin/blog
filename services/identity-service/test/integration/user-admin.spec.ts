import { eq } from 'drizzle-orm'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ServiceContext } from '@blog/contracts'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { errorHandler, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { outbox, sessions, users } from '../../src/infra/db/schema.ts'
import { userRoutes } from '../../src/modules/user/index.ts'

const SUPER = '11111111-1111-4111-8111-111111111111'
const ADMIN = '22222222-2222-4222-8222-222222222222'
const MEMBER = '33333333-3333-4333-8333-333333333333'

const viewers: Record<string, ServiceContext> = {
  guest: { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' },
  member: { user_id: MEMBER, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${MEMBER}` },
  admin: { user_id: ADMIN, role: 'admin', is_restricted: false, can_publish: true, viewer_key: `user:${ADMIN}` },
  superadmin: { user_id: SUPER, role: 'superadmin', is_restricted: false, can_publish: true, viewer_key: `user:${SUPER}` },
}

describe('identity: управление участниками', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    await database.db.insert(users).values([
      { id: SUPER, email: 'root@example.test', role: 'superadmin' },
      { id: ADMIN, email: 'admin@example.test', role: 'admin' },
      { id: MEMBER, email: 'member@example.test', role: 'member' },
    ])
    await database.db.insert(sessions).values([
      { id: 'session-a', user_id: MEMBER, expires_at: new Date(Date.now() + 86_400_000) },
      { id: 'session-b', user_id: MEMBER, expires_at: new Date(Date.now() + 86_400_000) },
    ])

    app = Fastify()
    await app.register(requestContext, { logger: createLogger({ service: 'identity-test', level: 'silent' }) })
    await app.register(errorHandler)
    app.decorateRequest('viewer', undefined as unknown as ServiceContext)
    app.addHook('onRequest', async (request) => {
      request.viewer = viewers[String(request.headers['x-test-viewer'])] ?? (viewers['guest'] as ServiceContext)
    })
    await app.register(userRoutes, { database })
  }, 120_000)

  afterAll(async () => {
    await app.close()
    await database.close()
    await postgres.stop()
  })

  it('администратор не меняет роли', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/users/${MEMBER}/role`,
      headers: { 'x-test-viewer': 'admin' },
      payload: { role: 'admin' },
    })
    expect(response.statusCode).toBe(403)
  })

  it('роль суперадминистратора не меняется', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/users/${SUPER}/role`,
      headers: { 'x-test-viewer': 'superadmin' },
      payload: { role: 'admin' },
    })
    expect(response.statusCode).toBe(403)
  })

  it('суперадминистратор меняет роль и право публикации', async () => {
    const role = await app.inject({
      method: 'PATCH',
      url: `/v1/users/${MEMBER}/role`,
      headers: { 'x-test-viewer': 'superadmin' },
      payload: { role: 'admin' },
    })
    expect(role.statusCode).toBe(200)
    expect(role.json()).toMatchObject({ id: MEMBER, role: 'admin' })

    const publishing = await app.inject({
      method: 'PATCH',
      url: `/v1/users/${MEMBER}/publishing`,
      headers: { 'x-test-viewer': 'superadmin' },
      payload: { can_publish: false },
    })
    expect(publishing.statusCode).toBe(200)
    expect(publishing.json()).toMatchObject({ can_publish: false })

    const events = await database.db.select().from(outbox).where(eq(outbox.name, 'identity.user.updated'))
    expect(events.length).toBeGreaterThanOrEqual(2)
  })

  it('ограничение отзывает все сессии и повторяется без новых событий', async () => {
    const before = await database.db.select().from(outbox)
    const response = await app.inject({
      method: 'POST',
      url: `/v1/users/${MEMBER}/restrict`,
      headers: { 'x-test-viewer': 'superadmin' },
      payload: {},
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ is_restricted: true })

    const stored = await database.db.select().from(sessions).where(eq(sessions.user_id, MEMBER))
    expect(stored.every((row) => row.revoked_at !== null)).toBe(true)

    const revoked = await database.db.select().from(outbox).where(eq(outbox.name, 'identity.session.revoked'))
    expect(revoked).toHaveLength(1)
    const restricted = await database.db.select().from(outbox).where(eq(outbox.name, 'identity.user.restricted'))
    expect(restricted).toHaveLength(1)

    const again = await app.inject({
      method: 'POST',
      url: `/v1/users/${MEMBER}/restrict`,
      headers: { 'x-test-viewer': 'superadmin' },
      payload: {},
    })
    expect(again.statusCode).toBe(200)
    const after = await database.db.select().from(outbox)
    expect(after).toHaveLength(before.length + 2)
  })

  it('поиск по почте доступен только суперадминистратору', async () => {
    const denied = await app.inject({ method: 'GET', url: '/v1/users?q=member', headers: { 'x-test-viewer': 'admin' } })
    expect(denied.statusCode).toBe(403)

    const found = await app.inject({ method: 'GET', url: '/v1/users?q=member@example', headers: { 'x-test-viewer': 'superadmin' } })
    expect(found.statusCode).toBe(200)
    expect(found.json().items).toEqual([expect.objectContaining({ id: MEMBER, email: 'member@example.test' })])
  })

  it('участник сохраняет вид, повтор не плодит события, гость получает отказ', async () => {
    const denied = await app.inject({
      method: 'PATCH',
      url: '/v1/users/me/appearance',
      headers: { 'x-test-viewer': 'guest' },
      payload: { appearance: 'light' },
    })
    expect(denied.statusCode).toBe(401)

    const before = await database.db.select().from(outbox).where(eq(outbox.name, 'identity.user.updated'))
    const response = await app.inject({
      method: 'PATCH',
      url: '/v1/users/me/appearance',
      headers: { 'x-test-viewer': 'member' },
      payload: { appearance: 'light' },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ appearance: 'light' })
    const [stored] = await database.db.select().from(users).where(eq(users.id, MEMBER))
    expect(stored?.appearance).toBe('light')
    const events = await database.db.select().from(outbox).where(eq(outbox.name, 'identity.user.updated'))
    expect(events).toHaveLength(before.length + 1)

    const again = await app.inject({
      method: 'PATCH',
      url: '/v1/users/me/appearance',
      headers: { 'x-test-viewer': 'member' },
      payload: { appearance: 'light' },
    })
    expect(again.statusCode).toBe(200)
    const after = await database.db.select().from(outbox).where(eq(outbox.name, 'identity.user.updated'))
    expect(after).toHaveLength(events.length)
  })
})
