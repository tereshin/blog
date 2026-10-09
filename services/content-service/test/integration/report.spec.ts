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
import { articles, topics, users_copy } from '../../src/infra/db/schema.ts'
import { reportRoutes } from '../../src/modules/report/index.ts'

const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const READER = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99'
const TOPIC = '5c9d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a01'
const ARTICLE = '00000000-0000-4000-8000-000000000201'
const HIDDEN = '00000000-0000-4000-8000-000000000202'

const viewers: Record<string, ServiceContext> = {
  guest: { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' },
  reader: { user_id: READER, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${READER}` },
  author: { user_id: AUTHOR, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${AUTHOR}` },
  restricted: { user_id: READER, role: 'member', is_restricted: true, can_publish: true, viewer_key: `user:${READER}` },
}

describe('content: жалобы', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    await database.db.insert(topics).values({ id: TOPIC, title: 'Технологии', slug: 'tech', position: 0 })
    await database.db.insert(users_copy).values([
      { user_id: AUTHOR, public_number: 7, created_at: new Date('2024-01-01T00:00:00.000Z') },
      { user_id: READER, public_number: 8, created_at: new Date('2024-01-01T00:00:00.000Z') },
    ])
    await database.db.insert(articles).values([
      { id: ARTICLE, author_id: AUTHOR, topic_id: TOPIC, title: 'Открытая', slug: 'open', status: 'published', visibility: 'public', published_at: new Date() },
      { id: HIDDEN, author_id: AUTHOR, topic_id: TOPIC, title: 'Скрытая', slug: 'hidden', status: 'hidden', visibility: 'public', published_at: new Date() },
    ])

    app = Fastify()
    await app.register(requestContext, { logger: createLogger({ service: 'content-test', level: 'silent' }) })
    await app.register(errorHandler)
    app.decorateRequest('viewer', undefined as unknown as ServiceContext)
    app.addHook('onRequest', async (request) => {
      request.viewer = viewers[String(request.headers['x-test-viewer'])] ?? (viewers['guest'] as ServiceContext)
    })
    await app.register(reportRoutes, { database })
  }, 120_000)

  afterAll(async () => {
    await app.close()
    await database.close()
    await postgres.stop()
  })

  it('одна открытая жалоба на пару, повтор возвращает её же', async () => {
    const own = await app.inject({ method: 'POST', url: `/v1/articles/${ARTICLE}/reports`, headers: { 'x-test-viewer': 'author' } })
    expect(own.statusCode).toBe(403)
    const hidden = await app.inject({ method: 'POST', url: `/v1/articles/${HIDDEN}/reports`, headers: { 'x-test-viewer': 'reader' } })
    expect(hidden.statusCode).toBe(404)
    const guest = await app.inject({ method: 'POST', url: `/v1/articles/${ARTICLE}/reports` })
    expect(guest.statusCode).toBe(401)
    const restricted = await app.inject({ method: 'POST', url: `/v1/articles/${ARTICLE}/reports`, headers: { 'x-test-viewer': 'restricted' } })
    expect(restricted.statusCode).toBe(403)

    const first = await app.inject({ method: 'POST', url: `/v1/articles/${ARTICLE}/reports`, headers: { 'x-test-viewer': 'reader' } })
    expect(first.statusCode).toBe(200)
    const again = await app.inject({ method: 'POST', url: `/v1/articles/${ARTICLE}/reports`, headers: { 'x-test-viewer': 'reader' } })
    expect(again.statusCode).toBe(200)
    expect(again.json()).toMatchObject({ id: first.json().id, status: 'open', article_id: ARTICLE, reporter_id: READER })
    const count = await database.pool.query<{ n: string }>('select count(*)::text as n from reports')
    expect(Number(count.rows[0]?.n)).toBe(1)
  })
})
