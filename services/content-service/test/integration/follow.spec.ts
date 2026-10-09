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
import { profiles, topics, users_copy } from '../../src/infra/db/schema.ts'
import { followRoutes } from '../../src/modules/follow/index.ts'
import { profileRoutes } from '../../src/modules/profile/index.ts'
import { topicRoutes } from '../../src/modules/topic/index.ts'

const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const READER = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99'
const TOPIC = '5c9d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a01'
const MISSING = '00000000-0000-4000-8000-000000000099'

const viewers: Record<string, ServiceContext> = {
  guest: { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' },
  reader: { user_id: READER, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${READER}` },
  restricted: { user_id: READER, role: 'member', is_restricted: true, can_publish: true, viewer_key: `user:${READER}` },
  author: { user_id: AUTHOR, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${AUTHOR}` },
}

describe('content: подписки', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    const created = new Date('2024-01-01T00:00:00.000Z')
    await database.db.insert(users_copy).values([
      { user_id: AUTHOR, public_number: 7, created_at: created },
      { user_id: READER, public_number: 8, created_at: created },
    ])
    await database.db.insert(profiles).values([
      { user_id: AUTHOR, display_name: 'Анна', slug: 'anna' },
      { user_id: READER, display_name: 'Роман', slug: 'roman' },
    ])
    await database.db.insert(topics).values({ id: TOPIC, title: 'Технологии', slug: 'tech', position: 0 })

    app = Fastify()
    await app.register(requestContext, { logger: createLogger({ service: 'content-test', level: 'silent' }) })
    await app.register(errorHandler)
    app.decorateRequest('viewer', undefined as unknown as ServiceContext)
    app.addHook('onRequest', async (request) => {
      request.viewer = viewers[String(request.headers['x-test-viewer'])] ?? (viewers['guest'] as ServiceContext)
    })
    await app.register(followRoutes, { database })
    await app.register(topicRoutes, { database, media_url: 'http://media.test' })
    await app.register(profileRoutes, { database, media_url: 'http://media.test', public_origin: 'http://blog.test' })
  }, 120_000)

  afterAll(async () => {
    await app.close()
    await database.close()
    await postgres.stop()
  })

  async function followCount(): Promise<number> {
    const result = await database.pool.query<{ n: string }>('select count(*)::text as n from follows')
    return Number(result.rows[0]?.n)
  }

  it('подписка на себя отклонена, повтор не дублирует, снятие убирает строку', async () => {
    const self = await app.inject({
      method: 'PUT',
      url: '/v1/follows',
      headers: { 'x-test-viewer': 'reader', 'content-type': 'application/json' },
      payload: { target_type: 'user', target_id: READER },
    })
    expect(self.statusCode).toBe(422)
    expect(self.json()).toMatchObject({ code: 'self_follow' })

    const missing = await app.inject({
      method: 'PUT',
      url: '/v1/follows',
      headers: { 'x-test-viewer': 'reader', 'content-type': 'application/json' },
      payload: { target_type: 'topic', target_id: MISSING },
    })
    expect(missing.statusCode).toBe(404)

    const restricted = await app.inject({
      method: 'PUT',
      url: '/v1/follows',
      headers: { 'x-test-viewer': 'restricted', 'content-type': 'application/json' },
      payload: { target_type: 'user', target_id: AUTHOR },
    })
    expect(restricted.statusCode).toBe(403)
    expect(restricted.json()).toMatchObject({ code: 'restricted' })

    const guest = await app.inject({
      method: 'PUT',
      url: '/v1/follows',
      headers: { 'content-type': 'application/json' },
      payload: { target_type: 'user', target_id: AUTHOR },
    })
    expect(guest.statusCode).toBe(401)

    const first = await app.inject({
      method: 'PUT',
      url: '/v1/follows',
      headers: { 'x-test-viewer': 'reader', 'content-type': 'application/json' },
      payload: { target_type: 'user', target_id: AUTHOR },
    })
    expect(first.statusCode).toBe(200)
    expect(first.json()).toEqual({ target_type: 'user', target_id: AUTHOR, is_following: true })
    const again = await app.inject({
      method: 'PUT',
      url: '/v1/follows',
      headers: { 'x-test-viewer': 'reader', 'content-type': 'application/json' },
      payload: { target_type: 'user', target_id: AUTHOR },
    })
    expect(again.statusCode).toBe(200)
    expect(await followCount()).toBe(1)

    const profile = await app.inject({ method: 'GET', url: '/v1/profiles/anna', headers: { 'x-test-viewer': 'reader' } })
    expect(profile.json()).toMatchObject({ followers_count: 1, is_following: true })
    const own = await app.inject({ method: 'GET', url: '/v1/profiles/roman', headers: { 'x-test-viewer': 'reader' } })
    expect(own.json()).toMatchObject({ following_count: 1 })

    const states = await app.inject({
      method: 'GET',
      url: `/v1/me/follows?target_type=user&target_ids=${AUTHOR},${MISSING}`,
      headers: { 'x-test-viewer': 'reader' },
    })
    expect(states.json()).toEqual({
      items: [
        { target_type: 'user', target_id: AUTHOR, is_following: true },
        { target_type: 'user', target_id: MISSING, is_following: false },
      ],
    })

    const topic = await app.inject({
      method: 'PUT',
      url: '/v1/follows',
      headers: { 'x-test-viewer': 'reader', 'content-type': 'application/json' },
      payload: { target_type: 'topic', target_id: TOPIC },
    })
    expect(topic.statusCode).toBe(200)
    const topic_page = await app.inject({ method: 'GET', url: '/v1/topics/tech', headers: { 'x-test-viewer': 'reader' } })
    expect(topic_page.json()).toMatchObject({ is_following: true })

    const removed = await app.inject({
      method: 'DELETE',
      url: '/v1/follows',
      headers: { 'x-test-viewer': 'reader', 'content-type': 'application/json' },
      payload: { target_type: 'user', target_id: AUTHOR },
    })
    expect(removed.json()).toEqual({ target_type: 'user', target_id: AUTHOR, is_following: false })
    expect(await followCount()).toBe(1)
    const after = await app.inject({ method: 'GET', url: '/v1/profiles/anna', headers: { 'x-test-viewer': 'reader' } })
    expect(after.json()).toMatchObject({ followers_count: 0, is_following: false })
  })
})
