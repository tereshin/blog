import { eq } from 'drizzle-orm'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { newEventId, processEvent } from '@blog/broker'
import type { OutboxEvent } from '@blog/broker'
import { notificationPageSchema } from '@blog/contracts'
import type { ServiceContext } from '@blog/contracts'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { errorHandler, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { notifications, outbox } from '../../src/infra/db/schema.ts'
import { createNotificationHandler, createNotificationRepository, notificationRoutes } from '../../src/modules/notification/index.ts'

const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const OTHER = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99'
const ARTICLE = '5c9d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a01'
const COMMENT = '4a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a31'
const CONSUMER = 'notification-test'

const guest: ServiceContext = { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' }
const author: ServiceContext = { user_id: AUTHOR, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${AUTHOR}` }

function event(name: string, payload: Record<string, unknown>): OutboxEvent {
  return { event_id: newEventId(), name, occurred_at: '2026-10-08T12:00:00.000Z', correlation_id: 'test', causation_id: null, version: 1, ...payload }
}

const user = { public_number: 7, role: 'member', can_publish: true, is_restricted: false, created_at: '2026-01-01T00:00:00.000Z' }
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

describe('notification: записи из событий (PostgreSQL в контейнере)', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    const repository = createNotificationRepository(database.db)
    const handler = createNotificationHandler(repository)
    const apply = (item: OutboxEvent) => processEvent(database.db, CONSUMER, item, handler)

    await apply(event('identity.user.created', { ...user, user_id: AUTHOR, display_name: 'Анна' }))
    await apply(event('identity.user.created', { ...user, user_id: OTHER, public_number: 8, display_name: 'Борис' }))
    await apply(event('content.article.published', article))

    app = Fastify()
    await app.register(requestContext, { logger: createLogger({ service: 'notification-test', level: 'silent' }) })
    await app.register(errorHandler)
    app.decorateRequest('viewer', undefined as unknown as ServiceContext)
    app.addHook('onRequest', async (request) => {
      request.viewer = request.headers['x-test-viewer'] === 'author' ? author : guest
    })
    await app.register(notificationRoutes, { database })

    const comment = event('discussion.comment.created', {
      comment_id: COMMENT,
      article_id: ARTICLE,
      author_id: OTHER,
      parent_id: null,
      parent_author_id: null,
      article_author_id: AUTHOR,
      excerpt: 'Текст',
    })
    expect(await apply(comment)).toBe('ok')
    expect(await apply(comment)).toBe('duplicate')
  }, 120_000)

  afterAll(async () => {
    await app.close()
    await database.close()
    await postgres.stop()
  })

  it('комментарий другого участника — одна запись и событие outbox, повтор не плодит строки', async () => {
    const rows = await database.db.select().from(notifications).where(eq(notifications.user_id, AUTHOR))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.kind).toBe('comment')
    const published = await database.db.select().from(outbox)
    expect(published.filter((item) => item.name === 'notification.notification.created')).toHaveLength(1)
  })

  it('свой комментарий и реакция на комментарий записей не создают', async () => {
    const repository = createNotificationRepository(database.db)
    const apply = (item: OutboxEvent) => processEvent(database.db, CONSUMER, item, createNotificationHandler(repository))
    await apply(
      event('discussion.comment.created', {
        comment_id: '4a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a32',
        article_id: ARTICLE,
        author_id: AUTHOR,
        parent_id: null,
        parent_author_id: null,
        article_author_id: AUTHOR,
        excerpt: 'Сам себе',
      }),
    )
    await apply(
      event('discussion.reaction.added', {
        target_type: 'comment',
        target_id: COMMENT,
        article_id: ARTICLE,
        actor_id: OTHER,
        target_author_id: AUTHOR,
        kind: 'heart',
      }),
    )
    const rows = await database.db.select().from(notifications).where(eq(notifications.user_id, AUTHOR))
    expect(rows.map((row) => row.kind)).toEqual(['comment'])
  })

  it('гость получает 401, автор видит своё уведомление', async () => {
    expect((await app.inject({ method: 'GET', url: '/v1/notifications' })).statusCode).toBe(401)
    const response = await app.inject({ method: 'GET', url: '/v1/notifications', headers: { 'x-test-viewer': 'author' } })
    expect(response.statusCode).toBe(200)
    const page = notificationPageSchema.parse(response.json())
    expect(page.items.map((item) => item.kind)).toEqual(['comment'])
    expect(page.items[0]?.article_slug).toBe('zagolovok')
    expect(page.items[0]?.actor.display_name).toBe('Борис')
  })
})
