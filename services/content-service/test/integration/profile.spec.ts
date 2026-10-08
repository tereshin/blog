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
import { articles, follows, outbox, profiles, slugs, topics, users_copy } from '../../src/infra/db/schema.ts'
import { profileRoutes } from '../../src/modules/profile/index.ts'

const OWNER = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const OTHER = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99'
const MEDIA = 'http://media.test'

const viewers: Record<string, ServiceContext> = {
  guest: { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' },
  owner: { user_id: OWNER, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${OWNER}` },
}

const body = {
  display_name: 'Анна',
  bio: 'Пишет',
  avatar_url: null,
  cover_url: null,
  slug: 'anna',
}

describe('content: профиль', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    const created = new Date('2020-01-01T00:00:00.000Z')
    await database.db.insert(users_copy).values([
      { user_id: OWNER, public_number: 7, role: 'member', can_publish: true, is_restricted: false, created_at: created },
      { user_id: OTHER, public_number: 8, role: 'member', can_publish: true, is_restricted: false, created_at: created },
    ])
    await database.db.insert(profiles).values([
      { user_id: OWNER, display_name: 'Анна', slug: null, reputation: 12 },
      { user_id: OTHER, display_name: 'Борис', slug: 'taken', reputation: 0 },
    ])
    await database.db.insert(slugs).values({ slug: 'taken', owner_type: 'profile', owner_id: OTHER })

    app = Fastify()
    await app.register(requestContext, { logger: createLogger({ service: 'content-test', level: 'silent' }) })
    await app.register(errorHandler)
    app.decorateRequest('viewer', undefined as unknown as ServiceContext)
    app.addHook('onRequest', async (request) => {
      request.viewer = viewers[String(request.headers['x-test-viewer'])] ?? (viewers['guest'] as ServiceContext)
    })
    await app.register(profileRoutes, { database, media_url: MEDIA, public_origin: 'http://blog.test' })
  }, 120_000)

  afterAll(async () => {
    await app.close()
    await database.close()
    await postgres.stop()
  })

  it('профиль открывается по номеру, если короткого адреса нет', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/profiles/7' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      user_id: OWNER,
      public_number: 7,
      display_name: 'Анна',
      slug: null,
      reputation: 12,
      badges: ['ten_reactions', 'one_year'],
      is_own: false,
    })
  })

  it('служебное слово не занимает адрес, прежний остаётся', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/v1/profiles/me',
      headers: { 'x-test-viewer': 'owner', 'content-type': 'application/json' },
      payload: { ...body, slug: 'admin' },
    })
    expect(response.statusCode).toBe(422)
    expect(response.json()).toMatchObject({ code: 'slug_reserved' })
    const [row] = await database.db.select().from(profiles).where(eq(profiles.user_id, OWNER))
    expect(row?.slug).toBeNull()
  })

  it('занятый адрес отклоняется, прежний остаётся', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/v1/profiles/me',
      headers: { 'x-test-viewer': 'owner', 'content-type': 'application/json' },
      payload: { ...body, slug: 'taken' },
    })
    expect(response.statusCode).toBe(409)
    expect(response.json()).toMatchObject({ code: 'slug_taken' })
    const [row] = await database.db.select().from(profiles).where(eq(profiles.user_id, OWNER))
    expect(row?.slug).toBeNull()
  })

  it('свой адрес сохраняется и уходит событием', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/v1/profiles/me',
      headers: { 'x-test-viewer': 'owner', 'content-type': 'application/json' },
      payload: { ...body, avatar_url: `${MEDIA}/a.png` },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ slug: 'anna', is_own: true, avatar_url: `${MEDIA}/a.png` })
    const events = await database.db.select().from(outbox).where(eq(outbox.name, 'content.profile.updated'))
    expect(events).toHaveLength(1)
  })

  it('владелец видит черновик, гость — нет; подписчики, статистика и рейтинг идут по курсору', async () => {
    const topic_id = '11111111-1111-4111-8111-111111111111'
    const published_id = '22222222-2222-4222-8222-222222222222'
    const draft_id = '33333333-3333-4333-8333-333333333333'
    await database.db.insert(topics).values({ id: topic_id, title: 'Технологии', slug: 'tech-profile', position: 1 })
    await database.db.insert(articles).values([
      {
        id: published_id,
        author_id: OWNER,
        topic_id,
        title: 'Публичная',
        slug: 'public-post',
        status: 'published',
        published_at: new Date('2024-01-02T00:00:00.000Z'),
        view_count: 4,
        reaction_count: 3,
      },
      { id: draft_id, author_id: OWNER, topic_id, title: 'Черновик', slug: 'draft-post', status: 'draft' },
    ])
    await database.db.insert(follows).values({ follower_id: OTHER, target_type: 'user', target_id: OWNER })

    const guest = await app.inject({ method: 'GET', url: '/v1/profiles/7/articles?sort=fresh' })
    expect(guest.statusCode).toBe(200)
    expect(guest.json().items.map((item: { title: string }) => item.title)).toEqual(['Публичная'])

    const owner = await app.inject({ method: 'GET', url: '/v1/profiles/7/articles', headers: { 'x-test-viewer': 'owner' } })
    expect(owner.json().items.map((item: { status: string }) => item.status).sort()).toEqual(['draft', 'published'])

    const followers = await app.inject({ method: 'GET', url: '/v1/profiles/7/followers' })
    expect(followers.json().items).toEqual([expect.objectContaining({ user_id: OTHER, slug: 'taken', reputation: 0 })])

    const stats = await app.inject({ method: 'GET', url: '/v1/profiles/me/stats', headers: { 'x-test-viewer': 'owner' } })
    expect(stats.json()).toEqual({ view_count: 4, reaction_count: 3, followers_count: 1 })

    const rating = await app.inject({ method: 'GET', url: '/v1/rating?limit=1' })
    expect(rating.json().items).toEqual([expect.objectContaining({ user_id: OWNER, reputation: 12 })])
    expect(rating.json().next_cursor).toEqual(expect.any(String))
  })
})
