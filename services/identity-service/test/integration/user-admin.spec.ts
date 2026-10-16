import { readFileSync } from 'node:fs'
import { UserRestrictedV1 } from '@blog/contracts'
import { eq } from 'drizzle-orm'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { ServiceContext } from '@blog/contracts'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { errorHandler, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { auth_identities, outbox, sessions, users } from '../../src/infra/db/schema.ts'
import { AuthRepository } from '../../src/modules/auth/auth.repository.ts'
import {
  UserController,
  UserEmailRepository,
  UserEmailVerificationService,
  UserRepository,
  UserService,
  userRoutes,
} from '../../src/modules/user/index.ts'

const SUPER = '11111111-1111-4111-8111-111111111111'
const ADMIN = '22222222-2222-4222-8222-222222222222'
const MEMBER = '33333333-3333-4333-8333-333333333333'

const viewers: Record<string, ServiceContext> = {
  guest: { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' },
  member: {
    user_id: MEMBER,
    role: 'member',
    is_restricted: false,
    can_publish: true,
    viewer_key: `user:${MEMBER}`,
  },
  admin: {
    user_id: ADMIN,
    role: 'admin',
    is_restricted: false,
    can_publish: true,
    viewer_key: `user:${ADMIN}`,
  },
  superadmin: {
    user_id: SUPER,
    role: 'superadmin',
    is_restricted: false,
    can_publish: true,
    viewer_key: `user:${SUPER}`,
  },
}

describe('identity: управление участниками', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance
  const firebase = { verifyUserEmail: vi.fn(async () => true) }

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    await database.db.insert(users).values([
      { id: SUPER, email: 'root@example.test', role: 'superadmin' },
      { id: ADMIN, email: 'admin@example.test', role: 'admin' },
      { id: MEMBER, email: 'member@example.test', role: 'member' },
    ])
    await database.db
      .insert(auth_identities)
      .values({
        id: '44444444-4444-4444-8444-444444444444',
        user_id: MEMBER,
        firebase_uid: 'member-uid',
        provider_id: 'password',
      })
    await database.db.insert(sessions).values([
      { id: 'session-a', user_id: MEMBER, expires_at: new Date(Date.now() + 86_400_000) },
      { id: 'session-b', user_id: MEMBER, expires_at: new Date(Date.now() + 86_400_000) },
    ])

    app = Fastify()
    await app.register(requestContext, {
      logger: createLogger({ service: 'identity-test', level: 'silent' }),
    })
    await app.register(errorHandler)
    app.decorateRequest('viewer', undefined as unknown as ServiceContext)
    app.addHook('onRequest', async (request) => {
      request.viewer =
        viewers[String(request.headers['x-test-viewer'])] ?? (viewers['guest'] as ServiceContext)
    })
    await app.register(userRoutes, {
      controller: new UserController(
        new UserService(new UserRepository(database.db)),
        new UserEmailVerificationService(new UserEmailRepository(database.db), firebase),
      ),
    })
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

    const events = await database.db
      .select()
      .from(outbox)
      .where(eq(outbox.name, 'identity.user.updated'))
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

    const revoked = await database.db
      .select()
      .from(outbox)
      .where(eq(outbox.name, 'identity.session.revoked'))
    expect(revoked).toHaveLength(1)
    const restricted = await database.db
      .select()
      .from(outbox)
      .where(eq(outbox.name, 'identity.user.restricted'))
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
    const denied = await app.inject({
      method: 'GET',
      url: '/v1/users?q=member',
      headers: { 'x-test-viewer': 'admin' },
    })
    expect(denied.statusCode).toBe(403)

    const found = await app.inject({
      method: 'GET',
      url: '/v1/users?q=member@example',
      headers: { 'x-test-viewer': 'superadmin' },
    })
    expect(found.statusCode).toBe(200)
    expect(found.json().items).toEqual([
      expect.objectContaining({ id: MEMBER, email: 'member@example.test' }),
    ])
  })

  it('участник сохраняет вид, повтор не плодит события, гость получает отказ', async () => {
    const denied = await app.inject({
      method: 'PATCH',
      url: '/v1/users/me/appearance',
      headers: { 'x-test-viewer': 'guest' },
      payload: { appearance: 'light' },
    })
    expect(denied.statusCode).toBe(401)

    const before = await database.db
      .select()
      .from(outbox)
      .where(eq(outbox.name, 'identity.user.updated'))
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
    const events = await database.db
      .select()
      .from(outbox)
      .where(eq(outbox.name, 'identity.user.updated'))
    expect(events).toHaveLength(before.length + 1)

    const again = await app.inject({
      method: 'PATCH',
      url: '/v1/users/me/appearance',
      headers: { 'x-test-viewer': 'member' },
      payload: { appearance: 'light' },
    })
    expect(again.statusCode).toBe(200)
    const after = await database.db
      .select()
      .from(outbox)
      .where(eq(outbox.name, 'identity.user.updated'))
    expect(after).toHaveLength(events.length)
  })

  it('участник возвращает системный вид: в учётной записи снова null', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/v1/users/me/appearance',
      headers: { 'x-test-viewer': 'member' },
      payload: { appearance: null },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ appearance: null })
    const [stored] = await database.db.select().from(users).where(eq(users.id, MEMBER))
    expect(stored?.appearance).toBeNull()
  })
  it('фильтрует роли и объединяет имя с почтой до пагинации', async () => {
    const headers = { 'x-test-viewer': 'superadmin' }
    const found = await app.inject({
      url: `/v1/users?q=Соф&name_ids=${MEMBER}&role=admin&limit=1`,
      headers,
    })
    expect(found.statusCode).toBe(200)
    expect(found.json().items).toEqual([expect.objectContaining({ id: MEMBER })])
    const members = await app.inject({
      url: `/v1/users?q=Соф&name_ids=${MEMBER}&role=member`,
      headers,
    })
    expect(members.json().items).toEqual([])
    const first = await app.inject({ url: '/v1/users?limit=1', headers })
    expect(first.json().items[0].id).toBe(SUPER)
    const second = await app.inject({
      url: `/v1/users?limit=1&cursor=${first.json().next_cursor}`,
      headers,
    })
    expect(second.json().items[0].id).toBe(ADMIN)
  })

  it('только суперадминистратор подтверждает почту, повтор идемпотентен', async () => {
    const url = `/v1/users/${MEMBER}/email-verification`
    for (const viewer of ['guest', 'member', 'admin']) {
      const denied = await app.inject({
        method: 'PUT',
        url,
        headers: { 'x-test-viewer': viewer },
        payload: {},
      })
      expect(denied.statusCode).toBe(viewer === 'guest' ? 401 : 403)
    }
    expect(firebase.verifyUserEmail).not.toHaveBeenCalled()
    const confirmed = await app.inject({
      method: 'PUT',
      url,
      headers: { 'x-test-viewer': 'superadmin' },
      payload: {},
    })
    expect(confirmed.statusCode, confirmed.body).toBe(204)
    expect(firebase.verifyUserEmail).toHaveBeenCalledWith('member-uid', 'member@example.test')
    const [stored] = await database.db.select().from(users).where(eq(users.id, MEMBER))
    expect(stored?.email_verified).toBe(true)
    const found = await app.inject({
      url: '/v1/users?q=member@example',
      headers: { 'x-test-viewer': 'superadmin' },
    })
    expect(found.json().items[0].email_verified).toBe(true)
    const repeated = await app.inject({
      method: 'PUT',
      url,
      headers: { 'x-test-viewer': 'superadmin' },
      payload: {},
    })
    expect(repeated.statusCode).toBe(204)
    expect(firebase.verifyUserEmail).toHaveBeenCalledTimes(1)
    expect(await new UserEmailRepository(database.db).confirm(MEMBER, 'changed@example.test')).toBe(
      false,
    )
  })

  it('удаление защищено правами, отзывает сессии и запрещает новый вход', async () => {
    const url = `/v1/users/${MEMBER}`
    expect(
      (await app.inject({ method: 'DELETE', url, headers: { 'x-test-viewer': 'admin' } }))
        .statusCode,
    ).toBe(403)
    expect(
      (
        await app.inject({
          method: 'DELETE',
          url: `/v1/users/${SUPER}`,
          headers: { 'x-test-viewer': 'superadmin' },
        })
      ).statusCode,
    ).toBe(403)
    await database.db.insert(sessions).values({
      id: 'delete-session',
      user_id: MEMBER,
      expires_at: new Date(Date.now() + 86_400_000),
    })
    expect(
      (await app.inject({ method: 'DELETE', url, headers: { 'x-test-viewer': 'superadmin' } }))
        .statusCode,
    ).toBe(204)
    const [stored] = await database.db.select().from(users).where(eq(users.id, MEMBER))
    expect(stored?.deleted_at).toBeInstanceOf(Date)
    const deletion_events = await database.db.select().from(outbox).where(eq(outbox.name, 'identity.user.restricted'))
    expect(deletion_events.some((event) => (event.payload as { is_deleted?: boolean }).is_deleted === true)).toBe(true)
    const account_sessions = await database.db
      .select()
      .from(sessions)
      .where(eq(sessions.user_id, MEMBER))
    expect(account_sessions.every((session) => session.revoked_at !== null)).toBe(true)
    const found = await app.inject({ url: '/v1/users', headers: { 'x-test-viewer': 'superadmin' } })
    expect(found.json().items.map((item: { id: string }) => item.id)).not.toContain(MEMBER)
    const auth = new AuthRepository(database.db)
    await expect(auth.findByEmail('member@example.test')).rejects.toMatchObject({
      http_status: 403,
    })
    await expect(
      auth.openSession({
        user_id: MEMBER,
        session_id: 'new-session',
        expires_at: new Date(Date.now() + 86_400_000),
      }),
    ).rejects.toMatchObject({ http_status: 403 })
    const restore = await app.inject({
      method: 'DELETE',
      url: `${url}/restriction`,
      headers: { 'x-test-viewer': 'superadmin' },
    })
    expect(restore.statusCode).toBe(404)
  })
  it('миграция повторно рассылает ранее удалённые аккаунты валидным событием', async () => {
    const sql = readFileSync(new URL('../../src/infra/db/migrations/20261016_republish_deleted_users.sql', import.meta.url), 'utf8')
    await database.pool.query(sql)
    const events = await database.db.select().from(outbox).where(eq(outbox.name, 'identity.user.restricted'))
    const replay = events.find((event) => (event.payload as { correlation_id: string }).correlation_id === 'deleted-users-backfill')
    expect(UserRestrictedV1.parse(replay?.payload)).toMatchObject({ user_id: MEMBER, is_deleted: true, is_restricted: true })
  })

})
