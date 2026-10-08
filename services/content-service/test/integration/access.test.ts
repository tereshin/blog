import { eq } from 'drizzle-orm'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ArticleAccessFields, ServiceContext } from '@blog/contracts'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { errorHandler, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { articles, topics } from '../../src/infra/db/schema.ts'
import { accessRoutes, canRead, visibleArticlesWhere } from '../../src/modules/access/index.ts'

const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const OTHER = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99'
const TOPIC = '5c9d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a01'

const viewers: Record<string, ServiceContext> = {
  guest: { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' },
  member: { user_id: OTHER, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${OTHER}` },
  author: { user_id: AUTHOR, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${AUTHOR}` },
  admin: { user_id: OTHER, role: 'admin', is_restricted: false, can_publish: true, viewer_key: `user:${OTHER}` },
  superadmin: { user_id: OTHER, role: 'superadmin', is_restricted: false, can_publish: true, viewer_key: `user:${OTHER}` },
}

const statuses: ArticleAccessFields['status'][] = ['draft', 'published', 'hidden', 'deleted']
const visibilities: ArticleAccessFields['visibility'][] = ['public', 'members', 'author']

describe('content: доступ к статьям на PostgreSQL', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance
  const ids = new Map<string, string>()
  const idOf = (key: string): string => {
    const id = ids.get(key)
    if (!id) throw new Error(`нет статьи ${key}`)
    return id
  }
  const viewerOf = (name: string): ServiceContext => {
    const viewer = viewers[name]
    if (!viewer) throw new Error(`нет зрителя ${name}`)
    return viewer
  }

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    await database.db.insert(topics).values({ id: TOPIC, title: 'Тема', slug: 'topic' })
    for (const status of statuses) {
      for (const visibility of visibilities) {
        const id = crypto.randomUUID()
        ids.set(`${status}/${visibility}`, id)
        await database.db.insert(articles).values({ id, author_id: AUTHOR, topic_id: TOPIC, title: 'T', slug: `a-${id}`, status, visibility })
      }
    }
    app = Fastify()
    await app.register(requestContext, { logger: createLogger({ service: 'content-test', level: 'silent' }) })
    await app.register(errorHandler)
    // Подпись служебного JWT проверяет отдельный плагин; здесь контекст зрителя берётся из заголовка теста.
    app.decorateRequest('viewer', undefined as unknown as ServiceContext)
    app.addHook('onRequest', async (request) => {
      request.viewer = viewers[String(request.headers['x-test-viewer'])] ?? viewerOf('guest')
    })
    await app.register(accessRoutes, { database })
  }, 120_000)

  afterAll(async () => {
    await app.close()
    await database.close()
    await postgres.stop()
  })

  it.each(Object.keys(viewers))('visibleArticlesWhere совпадает с canRead для зрителя %s на всех 12 состояниях', async (name) => {
    const viewer = viewerOf(name)
    const rows = await database.db.select({ id: articles.id }).from(articles).where(visibleArticlesWhere(viewer))
    const expected = [...ids.entries()]
      .filter(([key]) => {
        const [status, visibility] = key.split('/') as [ArticleAccessFields['status'], ArticleAccessFields['visibility']]
        return canRead(viewer, { author_id: AUTHOR, status, visibility })
      })
      .map(([, id]) => id)
    expect(rows.map((row) => row.id).sort()).toEqual(expected.sort())
  })

  it('удалённая статья не попадает ни в одну выборку', async () => {
    for (const viewer of Object.values(viewers)) {
      const rows = await database.db.select({ status: articles.status }).from(articles).where(visibleArticlesWhere(viewer))
      expect(rows.some((row) => row.status === 'deleted')).toBe(false)
    }
  })

  it('GET /internal/articles/{id}/access отдаёт решение владельца', async () => {
    const id = idOf('published/members')
    const guest = await app.inject({ method: 'GET', url: `/internal/articles/${id}/access` })
    expect(guest.json()).toEqual({ can_read: false, visibility: 'members', status: 'published', author_id: AUTHOR })
    const member = await app.inject({ method: 'GET', url: `/internal/articles/${id}/access`, headers: { 'x-test-viewer': 'member' } })
    expect(member.json()).toMatchObject({ can_read: true })
  })

  it('несуществующая статья — 404, неверный идентификатор — 422', async () => {
    expect((await app.inject({ method: 'GET', url: `/internal/articles/${crypto.randomUUID()}/access` })).statusCode).toBe(404)
    expect((await app.inject({ method: 'GET', url: '/internal/articles/not-a-uuid/access' })).statusCode).toBe(422)
  })

  it('смена статуса сразу меняет решение', async () => {
    const id = idOf('published/public')
    await database.db.update(articles).set({ status: 'deleted' }).where(eq(articles.id, id))
    const response = await app.inject({ method: 'GET', url: `/internal/articles/${id}/access`, headers: { 'x-test-viewer': 'superadmin' } })
    expect(response.json()).toMatchObject({ can_read: false, status: 'deleted' })
  })
})
