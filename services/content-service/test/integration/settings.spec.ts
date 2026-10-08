import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ServiceContext } from '@blog/contracts'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { errorHandler, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { outbox, settings } from '../../src/infra/db/schema.ts'
import { settingsRoutes } from '../../src/modules/settings/index.ts'

const MEDIA = 'http://media.test'
const SUPER = '11111111-1111-4111-8111-111111111111'

const viewers: Record<string, ServiceContext> = {
  guest: { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' },
  admin: { user_id: SUPER, role: 'admin', is_restricted: false, can_publish: true, viewer_key: `user:${SUPER}` },
  superadmin: { user_id: SUPER, role: 'superadmin', is_restricted: false, can_publish: true, viewer_key: `user:${SUPER}` },
}

const body = {
  name: 'Площадка',
  logo_url: `${MEDIA}/logo.png`,
  locale: 'en',
  about: 'О проекте',
  registration_open: false,
  new_members_can_publish: false,
}

describe('content: настройки площадки', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    app = Fastify()
    await app.register(requestContext, { logger: createLogger({ service: 'content-test', level: 'silent' }) })
    await app.register(errorHandler)
    app.decorateRequest('viewer', undefined as unknown as ServiceContext)
    app.addHook('onRequest', async (request) => {
      request.viewer = viewers[String(request.headers['x-test-viewer'])] ?? (viewers['guest'] as ServiceContext)
    })
    await app.register(settingsRoutes, { database, media_url: MEDIA })
  }, 120_000)

  afterAll(async () => {
    await app.close()
    await database.close()
    await postgres.stop()
  })

  it('пока строка не задана, публичные настройки — значения по умолчанию', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/settings' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ name: 'Блог', logo_url: null, locale: 'ru', about: '' })
  })

  it('администратор не сохраняет настройки и событие не появляется', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/v1/settings',
      headers: { 'x-test-viewer': 'admin', 'content-type': 'application/json' },
      payload: body,
    })
    expect(response.statusCode).toBe(403)
    expect(await database.db.select().from(outbox)).toHaveLength(0)
    expect(await database.db.select().from(settings)).toHaveLength(0)
  })

  it('логотип с чужого адреса не сохраняется', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/v1/settings',
      headers: { 'x-test-viewer': 'superadmin', 'content-type': 'application/json' },
      payload: { ...body, logo_url: 'https://evil.test/logo.png' },
    })
    expect(response.statusCode).toBe(422)
    expect(response.json()).toMatchObject({ code: 'validation_failed' })
  })

  it('суперадминистратор сохраняет настройки, публичный ответ скрывает флаги, событие уходит', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/v1/settings',
      headers: { 'x-test-viewer': 'superadmin', 'content-type': 'application/json' },
      payload: body,
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual(body)
    expect((await app.inject({ method: 'GET', url: '/v1/settings' })).json()).toEqual({
      name: 'Площадка',
      logo_url: `${MEDIA}/logo.png`,
      locale: 'en',
      about: 'О проекте',
    })
    const events = await database.db.select().from(outbox).where(eq(outbox.name, 'content.settings.updated'))
    expect(events).toHaveLength(1)
    expect(events[0]?.payload).toMatchObject({
      site_name: 'Площадка',
      registration_open: false,
      new_members_can_publish: false,
      locale: 'en',
    })
  })

  it('закрытые флаги видит только суперадминистратор', async () => {
    const denied = await app.inject({ method: 'GET', url: '/v1/settings/admin', headers: { 'x-test-viewer': 'admin' } })
    expect(denied.statusCode).toBe(403)
    const allowed = await app.inject({ method: 'GET', url: '/v1/settings/admin', headers: { 'x-test-viewer': 'superadmin' } })
    expect(allowed.statusCode).toBe(200)
    expect(allowed.json()).toMatchObject({ registration_open: false, new_members_can_publish: false })
  })
})
