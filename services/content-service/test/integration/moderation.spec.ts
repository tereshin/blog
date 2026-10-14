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
import { articles, profiles, reports, topics, users_copy } from '../../src/infra/db/schema.ts'
import { composeContent } from '../../src/app.modules.ts'
import { articleRoutes } from '../../src/modules/article/index.ts'
import { feedRoutes } from '../../src/modules/feed/index.ts'
import { moderationRoutes } from '../../src/modules/moderation/index.ts'
import { profileRoutes } from '../../src/modules/profile/index.ts'
import { searchRoutes } from '../../src/modules/search/index.ts'

const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const OTHER = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99'
const ADMIN = '8a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a88'
const TOPIC = '5c9d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a01'
const ARTICLE = '00000000-0000-4000-8000-000000000201'
const REPORT = '00000000-0000-4000-8000-000000000202'

const viewers: Record<string, ServiceContext> = {
  guest: { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' },
  author: {
    user_id: AUTHOR,
    role: 'member',
    is_restricted: false,
    can_publish: true,
    viewer_key: `user:${AUTHOR}`,
  },
  other: {
    user_id: OTHER,
    role: 'member',
    is_restricted: false,
    can_publish: true,
    viewer_key: `user:${OTHER}`,
  },
  admin: {
    user_id: ADMIN,
    role: 'admin',
    is_restricted: false,
    can_publish: true,
    viewer_key: `user:${ADMIN}`,
  },
}

describe('content: модерация статей', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    await database.db
      .insert(topics)
      .values({ id: TOPIC, title: 'Технологии', slug: 'tech', position: 0 })
    await database.db
      .insert(users_copy)
      .values({ user_id: AUTHOR, public_number: 7, created_at: new Date() })
    await database.db
      .insert(profiles)
      .values({ user_id: AUTHOR, display_name: 'Анна', slug: 'anna' })
    await database.db.insert(articles).values({
      id: ARTICLE,
      author_id: AUTHOR,
      topic_id: TOPIC,
      title: 'Скрываемая',
      slug: 'hidden-later',
      status: 'published',
      visibility: 'public',
      published_at: new Date(),
      excerpt: 'текст',
      blocks: {
        time: 1,
        blocks: [{ type: 'paragraph', data: { text: 'текст' } }],
        version: '2.28.0',
      },
    })
    await database.db.execute(
      sql`update articles set search_vector = to_tsvector('simple', 'скрываемая') where id = ${ARTICLE}`,
    )
    await database.db
      .insert(reports)
      .values({ id: REPORT, article_id: ARTICLE, reporter_id: OTHER })

    app = Fastify()
    await app.register(requestContext, {
      logger: createLogger({ service: 'content-test', level: 'silent' }),
    })
    await app.register(errorHandler)
    app.decorateRequest('viewer', undefined as unknown as ServiceContext)
    app.addHook('onRequest', async (request) => {
      request.viewer =
        viewers[String(request.headers['x-test-viewer'])] ?? (viewers['guest'] as ServiceContext)
    })
    const modules = composeContent({
      database,
      media_url: 'http://media.test',
      public_origin: 'http://blog.test',
      media_urls: ['http://media.test'],
      lookupFile: async () => null,
    })
    await app.register(moderationRoutes, { controller: modules.moderation })
    await app.register(feedRoutes, { controller: modules.feed })
    await app.register(searchRoutes, { controller: modules.search })
    await app.register(profileRoutes, { controller: modules.profile })
    await app.register(articleRoutes, { controller: modules.article })
  }, 120_000)

  afterAll(async () => {
    await app.close()
    await database.close()
    await postgres.stop()
  })

  async function ids(
    method: 'GET',
    url: string,
    viewer: string,
    pick: (body: {
      items?: { id: string }[]
      articles?: { id: string }[]
    }) => { id: string }[] | undefined,
  ) {
    const response = await app.inject({ method, url, headers: { 'x-test-viewer': viewer } })
    expect(response.statusCode).toBe(200)
    return (pick(response.json()) ?? []).map((item) => item.id)
  }

  it('участник не скрывает статью', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/v1/articles/${ARTICLE}/hide`,
      headers: { 'x-test-viewer': 'other' },
    })
    expect(response.statusCode).toBe(403)
  })

  it('скрытая статья уходит из ленты, поиска, темы и чужого профиля, автор её видит', async () => {
    const queue = await app.inject({
      method: 'GET',
      url: '/v1/moderation/articles?filter=reported',
      headers: { 'x-test-viewer': 'admin' },
    })
    expect(queue.statusCode).toBe(200)
    expect(queue.json().items[0].reports[0].id).toBe(REPORT)

    const hidden = await app.inject({
      method: 'POST',
      url: `/v1/articles/${ARTICLE}/hide`,
      headers: { 'x-test-viewer': 'admin' },
    })
    expect(hidden.statusCode).toBe(200)
    expect(hidden.json()).toMatchObject({ id: ARTICLE, status: 'hidden' })

    expect(await ids('GET', '/v1/feed?mode=fresh', 'guest', (body) => body.items)).not.toContain(
      ARTICLE,
    )
    expect(
      await ids('GET', '/v1/feed?mode=topic:tech', 'other', (body) => body.items),
    ).not.toContain(ARTICLE)
    expect(
      await ids('GET', '/v1/search?q=скрываемая', 'guest', (body) => body.articles),
    ).not.toContain(ARTICLE)
    expect(
      await ids('GET', '/v1/profiles/anna/articles', 'other', (body) => body.items),
    ).not.toContain(ARTICLE)
    expect(
      await ids('GET', '/v1/profiles/anna/articles', 'author', (body) => body.items),
    ).toContain(ARTICLE)

    const own = await app.inject({
      method: 'GET',
      url: '/v1/articles/hidden-later',
      headers: { 'x-test-viewer': 'author' },
    })
    expect(own.statusCode).toBe(200)
    expect(own.json().status).toBe('hidden')
    const guest = await app.inject({
      method: 'GET',
      url: '/v1/articles/hidden-later',
      headers: { 'x-test-viewer': 'guest' },
    })
    expect(guest.statusCode).toBe(404)
  })

  it('возврат публикует статью снова, жалоба отмечается разобранной', async () => {
    const restored = await app.inject({
      method: 'POST',
      url: `/v1/articles/${ARTICLE}/restore`,
      headers: { 'x-test-viewer': 'admin' },
    })
    expect(restored.statusCode).toBe(200)
    expect(restored.json()).toMatchObject({ status: 'published' })
    expect(await ids('GET', '/v1/feed?mode=fresh', 'guest', (body) => body.items)).toContain(
      ARTICLE,
    )
    expect(await ids('GET', '/v1/search?q=скрываемая', 'guest', (body) => body.articles)).toContain(
      ARTICLE,
    )

    const reviewed = await app.inject({
      method: 'PATCH',
      url: `/v1/reports/${REPORT}`,
      headers: { 'x-test-viewer': 'admin' },
      payload: { status: 'reviewed' },
    })
    expect(reviewed.statusCode).toBe(200)
    expect(reviewed.json().status).toBe('reviewed')

    const queue = await app.inject({
      method: 'GET',
      url: '/v1/moderation/articles?filter=reported',
      headers: { 'x-test-viewer': 'admin' },
    })
    expect(queue.json().items).toEqual([])
  })
  it('paginates reports independently and processes only the selected report atomically', async () => {
    const article_id = '00000000-0000-4000-8000-000000009000'
    await database.db
      .insert(articles)
      .values({
        id: article_id,
        author_id: AUTHOR,
        topic_id: TOPIC,
        title: 'Report pagination',
        slug: 'report-pagination',
        status: 'published',
        visibility: 'public',
        blocks: { blocks: [] },
        excerpt: '',
      })
    const report_ids = Array.from(
      { length: 60 },
      (_, n) => `00000000-0000-4000-8000-${String(9100 + n).padStart(12, '0')}`,
    )
    await database.db
      .insert(reports)
      .values(
        report_ids.map((id, n) => ({
          id,
          article_id,
          reporter_id: `00000000-0000-4000-8000-${String(9200 + n).padStart(12, '0')}`,
          created_at: new Date('2026-10-12T12:00:00Z'),
        })),
      )
    const headers = { 'x-test-viewer': 'admin' }
    const first = await app.inject({
      url: '/v1/moderation/articles/reports?q=report-pagination&from=2026-10-12&to=2026-10-12',
      headers,
    })
    expect(first.statusCode).toBe(200)
    const first_page = first.json<{ items: { report: { id: string } }[]; next_cursor: string }>()
    expect(first_page.items).toHaveLength(50)
    const second = await app.inject({
      url: `/v1/moderation/articles/reports?q=report-pagination&from=2026-10-12&to=2026-10-12&cursor=${first_page.next_cursor}`,
      headers,
    })
    expect(second.statusCode).toBe(200)
    expect(second.json().items).toHaveLength(10)
    expect(
      new Set([...first_page.items, ...second.json().items].map((item) => item.report.id)).size,
    ).toBe(60)
    expect(
      (
        await app.inject({
          url: `/v1/moderation/articles/reports?q=changed&cursor=${first_page.next_cursor}`,
          headers,
        })
      ).statusCode,
    ).toBe(422)
    const rejected = report_ids[0],
      hidden = report_ids[1]
    expect(rejected).toBeDefined()
    expect(hidden).toBeDefined()
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: `/v1/reports/${rejected}`,
          headers,
          payload: { action: 'dismiss' },
        })
      ).statusCode,
    ).toBe(200)
    expect(
      (
        await app.inject({
          url: '/v1/moderation/articles?filter=search&q=report-pagination',
          headers,
        })
      ).json().items[0].article.status,
    ).toBe('published')
    const hide = () =>
      app.inject({
        method: 'PATCH',
        url: `/v1/reports/${hidden}`,
        headers,
        payload: { action: 'hide' },
      })
    expect((await hide()).statusCode).toBe(200)
    const before = await database.pool.query('select count(*) from outbox')
    expect((await hide()).statusCode).toBe(200)
    expect((await database.pool.query('select count(*) from outbox')).rows[0].count).toBe(
      before.rows[0].count,
    )
    const processed = await app.inject({
      url: '/v1/moderation/articles/reports?q=report-pagination&status=reviewed',
      headers,
    })
    expect(processed.json().items).toHaveLength(2)
    expect(
      processed
        .json()
        .items.every((item: { article: { status: string } }) => item.article.status === 'hidden'),
    ).toBe(true)
    expect(
      (
        await app.inject({
          url: '/v1/moderation/articles?filter=hidden&q=report-pagination',
          headers,
        })
      ).json().items,
    ).toHaveLength(1)
    expect(
      (
        await app.inject({
          url: '/v1/moderation/articles/reports',
          headers: { 'x-test-viewer': 'other' },
        })
      ).statusCode,
    ).toBe(403)
  })
})
