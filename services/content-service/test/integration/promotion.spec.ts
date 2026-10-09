import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { feedPageSchema } from '@blog/contracts'
import type { ServiceContext } from '@blog/contracts'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { errorHandler, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { articles, profiles, topics, users_copy } from '../../src/infra/db/schema.ts'
import { feedRoutes } from '../../src/modules/feed/index.ts'
import { promotionRoutes } from '../../src/modules/promotion/index.ts'

const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const OTHER = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99'
const TOPIC = '5c9d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a01'
const OLD = '00000000-0000-4000-8000-000000000106'
const PLAIN = '00000000-0000-4000-8000-000000000107'
const DAY = 24 * 60 * 60 * 1000

const viewers: Record<string, ServiceContext> = {
  guest: { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' },
  author: { user_id: AUTHOR, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${AUTHOR}` },
  other: { user_id: OTHER, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${OTHER}` },
}

describe('content: продвижение', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    const now = Date.now()
    await database.db.insert(topics).values({ id: TOPIC, title: 'Технологии', slug: 'tech', position: 0 })
    await database.db.insert(users_copy).values({ user_id: AUTHOR, public_number: 7, created_at: new Date(now - 400 * DAY) })
    await database.db.insert(profiles).values({ user_id: AUTHOR, display_name: 'Анна', slug: 'anna' })
    await database.db.insert(articles).values([
      {
        id: OLD,
        author_id: AUTHOR,
        topic_id: TOPIC,
        title: 'Старая',
        slug: 'old-promoted',
        status: 'published',
        visibility: 'public',
        published_at: new Date(now - 30 * DAY),
      },
      {
        id: PLAIN,
        author_id: AUTHOR,
        topic_id: TOPIC,
        title: 'Тоже старая',
        slug: 'old-plain',
        status: 'published',
        visibility: 'public',
        published_at: new Date(now - 30 * DAY),
        reaction_count: 9,
      },
    ])

    app = Fastify()
    await app.register(requestContext, { logger: createLogger({ service: 'content-test', level: 'silent' }) })
    await app.register(errorHandler)
    app.decorateRequest('viewer', undefined as unknown as ServiceContext)
    app.addHook('onRequest', async (request) => {
      request.viewer = viewers[String(request.headers['x-test-viewer'])] ?? (viewers['guest'] as ServiceContext)
    })
    await app.register(promotionRoutes, { database })
    await app.register(feedRoutes, { database })
  }, 120_000)

  afterAll(async () => {
    await app.close()
    await database.close()
    await postgres.stop()
  })

  it('статья старше 7 суток с активным продвижением входит в популярное', async () => {
    const before = await app.inject({ method: 'GET', url: '/v1/feed?mode=popular' })
    expect(feedPageSchema.parse(before.json()).items.map((item) => item.id)).not.toContain(OLD)

    const denied = await app.inject({
      method: 'POST',
      url: `/v1/articles/${OLD}/promotion`,
      headers: { 'x-test-viewer': 'other', 'content-type': 'application/json' },
      payload: { package: 'basic' },
    })
    expect(denied.statusCode).toBe(403)

    const created = await app.inject({
      method: 'POST',
      url: `/v1/articles/${OLD}/promotion`,
      headers: { 'x-test-viewer': 'author', 'content-type': 'application/json' },
      payload: { package: 'basic' },
    })
    expect(created.statusCode).toBe(200)
    const promotion = created.json() as { confirmed_at: string; until: string; article_id: string }
    expect(promotion.article_id).toBe(OLD)
    expect(Date.parse(promotion.until) - Date.parse(promotion.confirmed_at)).toBe(7 * DAY)

    const after = await app.inject({ method: 'GET', url: '/v1/feed?mode=popular' })
    const ids = feedPageSchema.parse(after.json()).items.map((item) => item.id)
    expect(ids).toContain(OLD)
    expect(ids).not.toContain(PLAIN)

    const visible = await app.inject({ method: 'GET', url: `/v1/articles/${OLD}/promotion`, headers: { 'x-test-viewer': 'author' } })
    expect(visible.statusCode).toBe(200)
    const hidden = await app.inject({ method: 'GET', url: `/v1/articles/${OLD}/promotion`, headers: { 'x-test-viewer': 'other' } })
    expect(hidden.statusCode).toBe(403)
  })
})
