import { sql } from 'drizzle-orm'
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
import { articles, profiles, topics, users_copy } from '../../src/infra/db/schema.ts'
import { articleRoutes } from '../../src/modules/article/index.ts'
import { feedRoutes } from '../../src/modules/feed/index.ts'
import { profileRoutes } from '../../src/modules/profile/index.ts'
import { searchRoutes } from '../../src/modules/search/index.ts'

const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const OTHER = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99'
const ADMIN = '8a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a88'
const TOPIC = '5c9d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a01'
const PUBLIC_ID = '00000000-0000-4000-8000-000000000001'
const MEMBERS_ID = '00000000-0000-4000-8000-000000000002'
const AUTHOR_ID = '00000000-0000-4000-8000-000000000003'

const viewers: Record<string, ServiceContext> = {
  guest: { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' },
  member: { user_id: OTHER, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${OTHER}` },
  author: { user_id: AUTHOR, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${AUTHOR}` },
  admin: { user_id: ADMIN, role: 'admin', is_restricted: false, can_publish: true, viewer_key: `user:${ADMIN}` },
}

const expected: Record<string, string[]> = {
  guest: ['Открытая маячок'],
  member: ['Открытая маячок', 'Участникам маячок'],
  author: ['Открытая маячок', 'Участникам маячок', 'Личная маячок'],
  admin: ['Открытая маячок', 'Участникам маячок', 'Личная маячок'],
}

function blocks(secret: string) {
  return { time: 1, blocks: [{ type: 'paragraph', data: { text: secret } }], version: '2.28.0' }
}

describe('content: видимость на всех поверхностях', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    const { db } = database
    const vector = (text: string) => sql`to_tsvector('simple', ${text})`
    await db.insert(topics).values({ id: TOPIC, title: 'Технологии', slug: 'tech', position: 1 })
    await db.insert(users_copy).values([
      { user_id: AUTHOR, public_number: 7, created_at: new Date('2026-01-01T00:00:00Z') },
      { user_id: OTHER, public_number: 8, created_at: new Date('2026-01-02T00:00:00Z') },
      { user_id: ADMIN, public_number: 1, role: 'admin', created_at: new Date('2026-01-03T00:00:00Z') },
    ])
    await db.insert(profiles).values({ user_id: AUTHOR, display_name: 'Анна', slug: 'anna' })
    const base = { author_id: AUTHOR, topic_id: TOPIC, status: 'published' as const, published_at: new Date('2026-10-01T00:00:00Z') }
    await db.insert(articles).values([
      { ...base, id: PUBLIC_ID, title: 'Открытая маячок', slug: 'public', visibility: 'public', excerpt: 'фрагмент-открытый', blocks: blocks('текст-открытый'), search_vector: vector('Открытая маячок') },
      { ...base, id: MEMBERS_ID, title: 'Участникам маячок', slug: 'members', visibility: 'members', excerpt: 'фрагмент-участникам', blocks: blocks('текст-участникам'), search_vector: vector('Участникам маячок') },
      { ...base, id: AUTHOR_ID, title: 'Личная маячок', slug: 'personal', visibility: 'author', excerpt: 'фрагмент-автора', blocks: blocks('текст-автора'), search_vector: vector('Личная маячок') },
    ])

    app = Fastify()
    await app.register(requestContext, { logger: createLogger({ service: 'content-test', level: 'silent' }) })
    await app.register(errorHandler)
    app.decorateRequest('viewer', undefined as unknown as ServiceContext)
    app.addHook('onRequest', async (request) => {
      request.viewer = viewers[String(request.headers['x-test-viewer'])] ?? (viewers['guest'] as ServiceContext)
    })
    await app.register(feedRoutes, { database })
    await app.register(searchRoutes, { database })
    await app.register(articleRoutes, { database, media_urls: [], lookupFile: async () => null })
    await app.register(profileRoutes, { database, media_url: 'http://media.test', public_origin: 'http://blog.test' })
  }, 120_000)

  afterAll(async () => {
    await app.close()
    await database.close()
    await postgres.stop()
  })

  async function titles(url: string, viewer: string, field: 'items' | 'articles'): Promise<string[]> {
    const response = await app.inject({ method: 'GET', url, headers: { 'x-test-viewer': viewer } })
    expect(response.statusCode).toBe(200)
    const body = response.json() as { items?: { title: string }[]; articles?: { title: string }[] }
    const rows = field === 'articles' ? body.articles ?? [] : body.items ?? []
    return rows.map((item) => item.title).sort()
  }

  it.each(['guest', 'member', 'author', 'admin'])('%s видит один и тот же набор в ленте, теме, поиске, профиле и по id', async (viewer) => {
    const want = [...(expected[viewer] ?? [])].sort()
    expect(await titles('/v1/feed?mode=fresh', viewer, 'items')).toEqual(want)
    expect(await titles('/v1/feed?mode=topic:tech', viewer, 'items')).toEqual(want)
    expect(await titles('/v1/search?q=маячок', viewer, 'articles')).toEqual(want)
    expect(await titles('/v1/profiles/anna/articles', viewer, 'items')).toEqual(want)
    const ids = [PUBLIC_ID, MEMBERS_ID, AUTHOR_ID].join(',')
    expect(await titles(`/v1/articles?ids=${ids}`, viewer, 'items')).toEqual(want)
  })

  it('прямой адрес не отдаёт текст закрытой статьи', async () => {
    const guest_members = await app.inject({ method: 'GET', url: '/v1/articles/members', headers: { 'x-test-viewer': 'guest' } })
    expect(guest_members.statusCode).toBe(401)
    expect(guest_members.json()).toMatchObject({ code: 'unauthorized', errors: { reason: 'members_only' } })
    expect(guest_members.body).not.toContain('текст-участникам')

    const member_personal = await app.inject({ method: 'GET', url: '/v1/articles/personal', headers: { 'x-test-viewer': 'member' } })
    expect(member_personal.statusCode).toBe(404)
    expect(member_personal.body).not.toContain('текст-автора')

    const author_personal = await app.inject({ method: 'GET', url: '/v1/articles/personal', headers: { 'x-test-viewer': 'author' } })
    expect(author_personal.statusCode).toBe(200)
    expect(author_personal.body).toContain('текст-автора')

    const admin_personal = await app.inject({ method: 'GET', url: '/v1/articles/personal', headers: { 'x-test-viewer': 'admin' } })
    expect(admin_personal.statusCode).toBe(200)
  })
})
