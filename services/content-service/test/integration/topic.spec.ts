import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ServiceContext, Topic } from '@blog/contracts'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { errorHandler, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { topics } from '../../src/infra/db/schema.ts'
import { topicRoutes } from '../../src/modules/topic/index.ts'

const SUPER = '22222222-2222-4222-8222-222222222222'

const viewers: Record<string, ServiceContext> = {
  guest: { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' },
  member: { user_id: SUPER, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${SUPER}` },
  admin: { user_id: SUPER, role: 'admin', is_restricted: false, can_publish: true, viewer_key: `user:${SUPER}` },
  superadmin: { user_id: SUPER, role: 'superadmin', is_restricted: false, can_publish: true, viewer_key: `user:${SUPER}` },
}

function topicBody(slug: string, title: string) {
  return { title, description: 'О теме', avatar_url: null, cover_url: null, slug }
}

describe('content: темы', () => {
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
    await app.register(topicRoutes, { database, media_url: 'http://media.test' })
  }, 120_000)

  afterAll(async () => {
    await app.close()
    await database.close()
    await postgres.stop()
  })

  async function create(slug: string, title: string, viewer = 'superadmin'): Promise<Topic> {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/topics',
      headers: { 'x-test-viewer': viewer, 'content-type': 'application/json' },
      payload: topicBody(slug, title),
    })
    expect(response.statusCode).toBe(201)
    return response.json() as Topic
  }

  it('администратор не создаёт тему', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/topics',
      headers: { 'x-test-viewer': 'admin', 'content-type': 'application/json' },
      payload: topicBody('tech', 'Технологии'),
    })
    expect(response.statusCode).toBe(403)
    expect(await database.db.select().from(topics)).toHaveLength(0)
  })

  it('суперадминистратор создаёт темы по порядку, занятый адрес отклоняется', async () => {
    const first = await create('tech', 'Технологии')
    const second = await create('design', 'Дизайн')
    expect(first.position).toBe(0)
    expect(second.position).toBe(1)
    const taken = await app.inject({
      method: 'POST',
      url: '/v1/topics',
      headers: { 'x-test-viewer': 'superadmin', 'content-type': 'application/json' },
      payload: topicBody('tech', 'Ещё раз'),
    })
    expect(taken.statusCode).toBe(409)
    expect(taken.json()).toMatchObject({ code: 'slug_taken' })
    const [row] = await database.db.select().from(topics).where(eq(topics.slug, 'tech'))
    expect(row?.title).toBe('Технологии')
  })

  it('архивная тема пропадает из публичного списка и остаётся по адресу', async () => {
    const created = await create('science', 'Наука')
    const archived = await app.inject({
      method: 'PATCH',
      url: `/v1/topics/${created.id}`,
      headers: { 'x-test-viewer': 'superadmin', 'content-type': 'application/json' },
      payload: { status: 'archived' },
    })
    expect(archived.statusCode).toBe(200)
    const public_list = await app.inject({ method: 'GET', url: '/v1/topics' })
    expect((public_list.json() as Topic[]).map((topic) => topic.slug)).not.toContain('science')
    const denied = await app.inject({ method: 'GET', url: '/v1/topics?include_archived=1', headers: { 'x-test-viewer': 'member' } })
    expect(denied.statusCode).toBe(403)
    const full = await app.inject({ method: 'GET', url: '/v1/topics?include_archived=1', headers: { 'x-test-viewer': 'superadmin' } })
    expect((full.json() as Topic[]).map((topic) => topic.slug)).toContain('science')
    const by_slug = await app.inject({ method: 'GET', url: '/v1/topics/science' })
    expect(by_slug.statusCode).toBe(200)
    expect(by_slug.json()).toMatchObject({ status: 'archived' })
  })

  it('порядок тем меняется целиком', async () => {
    const listed = (await app.inject({ method: 'GET', url: '/v1/topics?include_archived=1', headers: { 'x-test-viewer': 'superadmin' } })).json() as Topic[]
    const reversed = [...listed].reverse().map((topic) => topic.id)
    const response = await app.inject({
      method: 'PUT',
      url: '/v1/topics/order',
      headers: { 'x-test-viewer': 'superadmin', 'content-type': 'application/json' },
      payload: { topic_ids: reversed },
    })
    expect(response.statusCode).toBe(200)
    expect((response.json() as Topic[]).map((topic) => topic.id)).toEqual(reversed)
  })
})
