import { eq } from 'drizzle-orm'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { popularCommentListSchema } from '@blog/contracts'
import type { ServiceContext } from '@blog/contracts'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { errorHandler, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { articles_copy, comments, outbox, users_copy } from '../../src/infra/db/schema.ts'
import { commentRoutes } from '../../src/modules/comment/index.ts'

const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const OTHER = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99'
const ADMIN = '8a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a88'
const ARTICLE = '00000000-0000-4000-8000-000000000301'
const COMMENT = '00000000-0000-4000-8000-000000000302'

const viewers: Record<string, ServiceContext> = {
  guest: { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' },
  member: { user_id: OTHER, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${OTHER}` },
  admin: { user_id: ADMIN, role: 'admin', is_restricted: false, can_publish: true, viewer_key: `user:${ADMIN}` },
}

describe('discussion: модерация комментария', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    await database.db.insert(users_copy).values({ user_id: AUTHOR, display_name: 'Анна', avatar_url: null })
    await database.db.insert(articles_copy).values({
      article_id: ARTICLE,
      author_id: AUTHOR,
      title: 'Статья',
      slug: 'statya',
      visibility: 'public',
      status: 'published',
      comments_enabled: true,
      published_at: new Date(),
    })
    await database.db.insert(comments).values({
      id: COMMENT,
      article_id: ARTICLE,
      author_id: AUTHOR,
      body: 'Лишний текст',
      reaction_count: 4,
      status: 'visible',
    })

    app = Fastify()
    await app.register(requestContext, { logger: createLogger({ service: 'discussion-test', level: 'silent' }) })
    await app.register(errorHandler)
    app.decorateRequest('viewer', undefined as unknown as ServiceContext)
    app.addHook('onRequest', async (request) => {
      request.viewer = viewers[String(request.headers['x-test-viewer'])] ?? (viewers['guest'] as ServiceContext)
    })
    await app.register(commentRoutes, { database })
  }, 120_000)

  afterAll(async () => {
    await app.close()
    await database.close()
    await postgres.stop()
  })

  it('участник не скрывает чужой комментарий', async () => {
    const response = await app.inject({ method: 'POST', url: `/v1/comments/${COMMENT}/hide`, headers: { 'x-test-viewer': 'member' } })
    expect(response.statusCode).toBe(403)
  })

  it('скрытие убирает текст и комментарий из популярных, возврат его возвращает', async () => {
    const hidden = await app.inject({ method: 'POST', url: `/v1/comments/${COMMENT}/hide`, headers: { 'x-test-viewer': 'admin' } })
    expect(hidden.statusCode).toBe(200)
    expect(hidden.json()).toMatchObject({ id: COMMENT, status: 'hidden', body: null })

    const popular = await app.inject({ method: 'GET', url: '/v1/comments/popular', headers: { 'x-test-viewer': 'guest' } })
    expect(popularCommentListSchema.parse(popular.json()).map((item) => item.id)).not.toContain(COMMENT)

    const events = await database.db.select().from(outbox).where(eq(outbox.name, 'discussion.comment.hidden'))
    expect(events).toHaveLength(1)

    const restored = await app.inject({ method: 'POST', url: `/v1/comments/${COMMENT}/restore`, headers: { 'x-test-viewer': 'admin' } })
    expect(restored.statusCode).toBe(200)
    expect(restored.json()).toMatchObject({ status: 'visible', body: 'Лишний текст' })
  })
})
