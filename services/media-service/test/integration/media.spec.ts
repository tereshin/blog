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
import { mediaRoutes } from '../../src/modules/media/index.ts'
import type { ObjectStore } from '../../src/modules/media/index.ts'

const MEMBER = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

const viewers: Record<string, ServiceContext> = {
  guest: { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' },
  member: { user_id: MEMBER, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${MEMBER}` },
}

describe('media: загрузка файла', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance
  const puts: { key: string; byte_size: number }[] = []
  const store: ObjectStore = {
    async put(input) {
      puts.push({ key: input.key, byte_size: input.body.byteLength })
    },
  }

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    app = Fastify()
    await app.register(requestContext, { logger: createLogger({ service: 'media-test', level: 'silent' }) })
    await app.register(errorHandler)
    app.decorateRequest('viewer', undefined as unknown as ServiceContext)
    app.addHook('onRequest', async (request) => {
      request.viewer = viewers[String(request.headers['x-test-viewer'])] ?? (viewers['guest'] as ServiceContext)
    })
    await app.register(mediaRoutes, { database, store, public_url: 'http://files.test/media' })
  }, 120_000)

  afterAll(async () => {
    await app.close()
    await database.close()
    await postgres.stop()
  })

  it('текст вместо изображения — 415', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/media?kind=image',
      headers: { 'content-type': 'application/octet-stream', 'x-idempotency-key': 'text', 'x-test-viewer': 'member' },
      payload: Buffer.from('привет'),
    })
    expect(response.statusCode).toBe(415)
    expect(response.json()).toMatchObject({ code: 'unsupported_media_type' })
  })

  it('изображение больше предела — 413', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/media?kind=image',
      headers: {
        'content-type': 'application/octet-stream',
        'content-length': String(9 * 1024 * 1024),
        'x-idempotency-key': 'huge',
        'x-test-viewer': 'member',
      },
      payload: PNG,
    })
    expect(response.statusCode).toBe(413)
    expect(puts).toHaveLength(0)
  })

  it('png сохраняется, повтор с тем же ключом не пишет объект второй раз', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/media?kind=image',
      headers: { 'content-type': 'application/octet-stream', 'x-idempotency-key': 'png-1', 'x-test-viewer': 'member' },
      payload: PNG,
    })
    expect(response.statusCode).toBe(201)
    const body = response.json<{ id: string; url: string; mime: string; kind: string }>()
    expect(body).toMatchObject({ mime: 'image/png', kind: 'image' })
    expect(body.url).toMatch(/^http:\/\/files\.test\/media\/uploads\//)
    expect(puts).toHaveLength(1)

    const again = await app.inject({
      method: 'POST',
      url: '/v1/media?kind=image',
      headers: { 'content-type': 'application/octet-stream', 'x-idempotency-key': 'png-1', 'x-test-viewer': 'member' },
      payload: PNG,
    })
    expect(again.statusCode).toBe(201)
    expect(again.json()).toMatchObject({ id: body.id })
    expect(puts).toHaveLength(1)

    const lookup = await app.inject({ method: 'GET', url: `/internal/files?url=${encodeURIComponent(body.url)}` })
    expect(lookup.json()).toEqual({ uploader_id: MEMBER, kind: 'image' })
  })

  it('гость не загружает', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/media?kind=image',
      headers: { 'x-idempotency-key': 'guest', 'x-test-viewer': 'guest' },
      payload: PNG,
    })
    expect(response.statusCode).toBe(401)
  })
})
