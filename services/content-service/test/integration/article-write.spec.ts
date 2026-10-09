import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ArticleDraft, FeedPage, ProfileArticlePage, ServiceContext, Topic } from '@blog/contracts'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { errorHandler, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { articles, outbox, profiles, users_copy } from '../../src/infra/db/schema.ts'
import { articleRoutes } from '../../src/modules/article/index.ts'
import { feedRoutes } from '../../src/modules/feed/index.ts'
import { profileRoutes } from '../../src/modules/profile/index.ts'
import { topicRoutes } from '../../src/modules/topic/index.ts'

const AUTHOR = '11111111-1111-4111-8111-111111111111'
const OTHER = '33333333-3333-4333-8333-333333333333'

const viewers: Record<string, ServiceContext> = {
  guest: { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' },
  author: { user_id: AUTHOR, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${AUTHOR}` },
  nopublish: { user_id: AUTHOR, role: 'member', is_restricted: false, can_publish: false, viewer_key: `user:${AUTHOR}` },
  restricted: { user_id: AUTHOR, role: 'member', is_restricted: true, can_publish: true, viewer_key: `user:${AUTHOR}` },
  other: { user_id: OTHER, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${OTHER}` },
  superadmin: { user_id: AUTHOR, role: 'superadmin', is_restricted: false, can_publish: true, viewer_key: `user:${AUTHOR}` },
}

function paragraph(text: string) {
  return { blocks: [{ type: 'paragraph', data: { text } }] }
}

describe('content: запись статьи', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance
  let topic: Topic

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    await database.db.insert(users_copy).values([
      { user_id: AUTHOR, public_number: 7, role: 'member', can_publish: true, is_restricted: false, created_at: new Date('2020-01-01T00:00:00.000Z') },
      { user_id: OTHER, public_number: 8, role: 'member', can_publish: true, is_restricted: false, created_at: new Date('2020-01-01T00:00:00.000Z') },
    ])
    await database.db.insert(profiles).values([
      { user_id: AUTHOR, display_name: 'Автор', slug: 'author-one' },
      { user_id: OTHER, display_name: 'Читатель', slug: 'reader-one' },
    ])
    app = Fastify()
    await app.register(requestContext, { logger: createLogger({ service: 'content-test', level: 'silent' }) })
    await app.register(errorHandler)
    // Заглушка декоратора: зрителя подставляет хук до обработчика, до первого запроса значения нет.
    app.decorateRequest('viewer', undefined as unknown as ServiceContext)
    app.addHook('onRequest', async (request) => {
      request.viewer = viewers[String(request.headers['x-test-viewer'])] ?? (viewers['guest'] as ServiceContext)
    })
    await app.register(topicRoutes, { database, media_url: 'http://media.test' })
    await app.register(feedRoutes, { database })
    await app.register(profileRoutes, { database, media_url: 'http://media.test', public_origin: 'http://blog.test' })
    await app.register(articleRoutes, { database, media_urls: ['http://media.test'], lookupFile: async () => null })
    const created = await app.inject({
      method: 'POST',
      url: '/v1/topics',
      headers: { 'x-test-viewer': 'superadmin', 'content-type': 'application/json' },
      payload: { title: 'Наука', description: 'О теме', avatar_url: null, cover_url: null, slug: 'science' },
    })
    expect(created.statusCode).toBe(201)
    topic = created.json() as Topic
  }, 120_000)

  afterAll(async () => {
    await app.close()
    await database.close()
    await postgres.stop()
  })

  function create(title: string, document: unknown, viewer = 'author') {
    return app.inject({
      method: 'POST',
      url: '/v1/articles',
      headers: { 'x-test-viewer': viewer, 'content-type': 'application/json' },
      payload: { title, topic_id: topic.id, blocks: document },
    })
  }

  async function listedIds(url: string, viewer = 'other'): Promise<string[]> {
    const response = await app.inject({ method: 'GET', url, headers: { 'x-test-viewer': viewer } })
    expect(response.statusCode).toBe(200)
    const body = response.json() as FeedPage | ProfileArticlePage
    return body.items.map((item) => item.id)
  }

  async function searchHits(id: string, word: string): Promise<number> {
    const found = await database.pool.query<{ n: number }>('select count(*)::int as n from articles where id = $1 and search_vector @@ plainto_tsquery(\'simple\', $2)', [id, word])
    return found.rows[0]?.n ?? 0
  }

  it('гость, участник без права и ограниченный не создают черновик', async () => {
    const before = await database.db.select({ id: articles.id }).from(articles)
    const guest = await create('Нельзя', paragraph('текст'), 'guest')
    expect(guest.statusCode).toBe(401)
    const denied = await create('Нельзя', paragraph('текст'), 'nopublish')
    expect(denied.statusCode).toBe(403)
    expect(denied.json()).toMatchObject({ code: 'cannot_publish' })
    const blocked = await create('Нельзя', paragraph('текст'), 'restricted')
    expect(blocked.statusCode).toBe(403)
    expect(blocked.json()).toMatchObject({ code: 'restricted' })
    expect(await database.db.select({ id: articles.id }).from(articles)).toHaveLength(before.length)
  })

  it('черновик скрыт, пустая публикация отклонена, адрес живёт после смены заголовка, событие уходит', async () => {
    const draft_response = await create('Заметка про teleskop', paragraph('Смотрим на teleskop'))
    expect(draft_response.statusCode).toBe(201)
    const draft = draft_response.json() as ArticleDraft
    expect(draft.status).toBe('draft')
    const slug = draft.slug

    expect(await listedIds('/v1/feed?mode=fresh')).not.toContain(draft.id)
    expect(await listedIds('/v1/feed?mode=topic:science')).not.toContain(draft.id)
    expect(await listedIds('/v1/profiles/author-one/articles')).not.toContain(draft.id)
    expect(await searchHits(draft.id, 'teleskop')).toBe(0)
    const mine = await app.inject({ method: 'GET', url: '/v1/me/articles?status=draft', headers: { 'x-test-viewer': 'author' } })
    expect(mine.statusCode).toBe(200)
    expect((mine.json() as { items: ArticleDraft[] }).items.map((item) => item.id)).toContain(draft.id)
    const hidden = await app.inject({ method: 'GET', url: `/v1/articles/${draft.id}/draft`, headers: { 'x-test-viewer': 'other' } })
    expect(hidden.statusCode).toBe(404)

    const empty = await create('Пустая', { blocks: [{ type: 'delimiter', data: {} }] })
    expect(empty.statusCode).toBe(201)
    const empty_draft = empty.json() as ArticleDraft
    const rejected = await app.inject({
      method: 'POST',
      url: `/v1/articles/${empty_draft.id}/publish`,
      headers: { 'x-test-viewer': 'author' },
    })
    expect(rejected.statusCode).toBe(422)
    expect(rejected.json()).toMatchObject({ code: 'not_publishable', errors: { reasons: ['content'] } })
    expect(await listedIds('/v1/feed?mode=fresh')).not.toContain(empty_draft.id)

    const published = await app.inject({
      method: 'POST',
      url: `/v1/articles/${draft.id}/publish`,
      headers: { 'x-test-viewer': 'author' },
    })
    expect(published.statusCode).toBe(200)
    expect(published.json()).toMatchObject({ status: 'published', slug })
    expect(await listedIds('/v1/feed?mode=fresh')).toContain(draft.id)
    expect(await listedIds('/v1/feed?mode=topic:science')).toContain(draft.id)
    expect(await searchHits(draft.id, 'teleskop')).toBe(1)

    const renamed = await app.inject({
      method: 'PATCH',
      url: `/v1/articles/${draft.id}`,
      headers: { 'x-test-viewer': 'author', 'content-type': 'application/json' },
      payload: { title: 'Совсем другой заголовок' },
    })
    expect(renamed.statusCode).toBe(200)
    expect(renamed.json()).toMatchObject({ title: 'Совсем другой заголовок', slug })
    const [row] = await database.db.select({ slug: articles.slug }).from(articles).where(eq(articles.id, draft.id))
    expect(row?.slug).toBe(slug)

    const events = await database.db.select().from(outbox)
    const published_event = events.find((item) => item.name === 'content.article.published')
    const updated_event = events.find((item) => item.name === 'content.article.updated')
    expect(published_event?.payload).toMatchObject({ article_id: draft.id, slug, status: 'published' })
    expect(updated_event?.payload).toMatchObject({ article_id: draft.id, slug, title: 'Совсем другой заголовок', status: 'published' })
  })
})
