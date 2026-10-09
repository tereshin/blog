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
import { articles_copy } from '../../src/infra/db/schema.ts'
import { seenRoutes } from '../../src/modules/seen/index.ts'

const ARTICLE = '00000000-0000-4000-8000-000000000301'
const OTHER = '00000000-0000-4000-8000-000000000302'
const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'

const guest: ServiceContext = { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' }

describe('discussion: просмотренное в ленте', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    await database.db.insert(articles_copy).values({
      article_id: ARTICLE,
      author_id: AUTHOR,
      title: 'Заметка',
      slug: 'note',
      visibility: 'public',
      status: 'published',
      comments_enabled: true,
      published_at: new Date('2026-01-01T00:00:00.000Z'),
    })

    app = Fastify()
    await app.register(requestContext, { logger: createLogger({ service: 'discussion-test', level: 'silent' }) })
    await app.register(errorHandler)
    app.decorateRequest('viewer', undefined as unknown as ServiceContext)
    app.addHook('onRequest', async (request) => {
      request.viewer = guest
    })
    await app.register(seenRoutes, { database })
  }, 120_000)

  afterAll(async () => {
    await app.close()
    await database.close()
    await postgres.stop()
  })

  it('повторная отметка не создаёт вторую строку и не пишет просмотр', async () => {
    const body = { feed_key: 'fresh', article_id: ARTICLE }
    const first = await app.inject({ method: 'PUT', url: '/v1/feed-seen', headers: { 'content-type': 'application/json' }, payload: body })
    const second = await app.inject({ method: 'PUT', url: '/v1/feed-seen', headers: { 'content-type': 'application/json' }, payload: body })
    expect(first.statusCode).toBe(200)
    expect(second.statusCode).toBe(200)
    const rows = await database.pool.query<{ n: string }>('select count(*)::text as n from feed_seen')
    expect(Number(rows.rows[0]?.n)).toBe(1)
    const views = await database.pool.query<{ n: string }>('select count(*)::text as n from views')
    expect(Number(views.rows[0]?.n)).toBe(0)

    await app.inject({
      method: 'PUT',
      url: '/v1/feed-seen',
      headers: { 'content-type': 'application/json' },
      payload: { feed_key: 'popular', article_id: OTHER },
    })
    const fresh = await app.inject({ method: 'GET', url: '/v1/feed-seen?feed_key=fresh' })
    expect(fresh.json()).toEqual({ article_ids: [ARTICLE] })
    const popular = await app.inject({ method: 'GET', url: '/v1/feed-seen?feed_key=popular' })
    expect(popular.json()).toEqual({ article_ids: [OTHER] })
  })
})
