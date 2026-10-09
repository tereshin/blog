import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { newEventId, processEvent } from '@blog/broker'
import type { OutboxEvent } from '@blog/broker'
import type { ServiceContext } from '@blog/contracts'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { errorHandler, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { articles_copy, bookmarks, comments, users_copy } from '../../src/infra/db/schema.ts'
import { bookmarkRoutes } from '../../src/modules/bookmark/index.ts'
import { commentRoutes } from '../../src/modules/comment/index.ts'
import { createCopiesHandler } from '../../src/modules/copies/index.ts'
import { reactionRoutes } from '../../src/modules/reaction/index.ts'

const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const READER = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99'
const ARTICLE = '5c9d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a01'
const COMMENT = '6c9d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a02'

const viewers: Record<string, ServiceContext> = {
  guest: { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' },
  reader: { user_id: READER, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${READER}` },
}

const article = {
  article_id: ARTICLE,
  author_id: AUTHOR,
  topic_id: '5f0f6a52-0d8b-4f6e-a8b1-000000000001',
  title: 'Заголовок',
  slug: 'zagolovok',
  visibility: 'public',
  status: 'published',
  comments_enabled: true,
  excerpt: 'Коротко',
  first_image_url: null,
  published_at: '2026-10-01T00:00:00.000Z',
}

function event(name: string, payload: Record<string, unknown>): OutboxEvent {
  return {
    event_id: newEventId(),
    name,
    occurred_at: '2026-10-08T10:00:00.000Z',
    correlation_id: 'test',
    causation_id: null,
    version: 1,
    ...payload,
  }
}

describe('discussion: удалённая статья не отдаёт обсуждение', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance
  const apply = (item: OutboxEvent) => processEvent(database.db, 'test-deleted-copy', item, createCopiesHandler())

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    await apply(event('content.article.published', article))
    await database.db.insert(users_copy).values({ user_id: AUTHOR, display_name: 'Анна', avatar_url: null })
    await database.db.insert(comments).values({ id: COMMENT, article_id: ARTICLE, author_id: AUTHOR, body: 'Живой комментарий', reaction_count: 3 })
    await database.db.insert(bookmarks).values({ user_id: READER, article_id: ARTICLE })

    app = Fastify()
    await app.register(requestContext, { logger: createLogger({ service: 'discussion-test', level: 'silent' }) })
    await app.register(errorHandler)
    // Заглушка декоратора: зрителя подставляет хук до обработчика, до первого запроса значения нет.
    app.decorateRequest('viewer', undefined as unknown as ServiceContext)
    app.addHook('onRequest', async (request) => {
      request.viewer = viewers[String(request.headers['x-test-viewer'])] ?? (viewers['guest'] as ServiceContext)
    })
    await app.register(commentRoutes, { database })
    await app.register(bookmarkRoutes, { database })
    await app.register(reactionRoutes, { database })
  }, 120_000)

  afterAll(async () => {
    await app.close()
    await database.close()
    await postgres.stop()
  })

  it('правка копии меняет поля, повторное удаление не плодит строки, обсуждение пропадает', async () => {
    const comments_before = await app.inject({ method: 'GET', url: `/v1/articles/${ARTICLE}/comments` })
    expect(comments_before.statusCode).toBe(200)
    expect(comments_before.json()).toMatchObject({ comments: [{ id: COMMENT }] })
    const bookmarks_before = await app.inject({ method: 'GET', url: '/v1/bookmarks', headers: { 'x-test-viewer': 'reader' } })
    expect(bookmarks_before.json()).toMatchObject({ article_ids: [ARTICLE] })

    const updated = event('content.article.updated', {
      ...article,
      title: 'Новый',
      slug: 'novyi',
      visibility: 'members',
      comments_enabled: false,
    })
    expect(await apply(updated)).toBe('ok')
    expect(await apply(updated)).toBe('duplicate')
    const [copy] = await database.db.select().from(articles_copy).where(eq(articles_copy.article_id, ARTICLE))
    expect(copy).toMatchObject({ title: 'Новый', slug: 'novyi', visibility: 'members', comments_enabled: false, status: 'published' })

    const popular = await app.inject({ method: 'GET', url: '/v1/comments/popular', headers: { 'x-test-viewer': 'reader' } })
    expect(popular.json()).toMatchObject([{ id: COMMENT, article_slug: 'novyi', article_title: 'Новый' }])

    const deleted = event('content.article.deleted', { ...article, title: 'Новый', slug: 'novyi', visibility: 'members', comments_enabled: false, status: 'deleted' })
    expect(await apply(deleted)).toBe('ok')
    expect(await apply(deleted)).toBe('duplicate')
    expect(await database.db.select().from(articles_copy)).toHaveLength(1)

    const comments_after = await app.inject({ method: 'GET', url: `/v1/articles/${ARTICLE}/comments`, headers: { 'x-test-viewer': 'reader' } })
    expect(comments_after.statusCode).toBe(404)
    const popular_after = await app.inject({ method: 'GET', url: '/v1/comments/popular', headers: { 'x-test-viewer': 'reader' } })
    expect(popular_after.json()).toEqual([])
    const bookmarks_after = await app.inject({ method: 'GET', url: '/v1/bookmarks', headers: { 'x-test-viewer': 'reader' } })
    expect(bookmarks_after.json()).toMatchObject({ article_ids: [] })
    const reaction = await app.inject({
      method: 'POST',
      url: '/v1/reactions',
      headers: { 'x-test-viewer': 'reader', 'content-type': 'application/json' },
      payload: { target_type: 'article', target_id: ARTICLE, kind: 'laugh' },
    })
    expect(reaction.statusCode).toBe(404)
  })
})