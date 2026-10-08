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
import { articles_copy, comments, users_copy } from '../../src/infra/db/schema.ts'
import { commentRoutes, toExcerpt } from '../../src/modules/comment/index.ts'

const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const OTHER = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99'
const ADMIN = '8a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a88'

const viewers: Record<string, ServiceContext> = {
  guest: { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' },
  member: { user_id: OTHER, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${OTHER}` },
  author: { user_id: AUTHOR, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${AUTHOR}` },
  admin: { user_id: ADMIN, role: 'admin', is_restricted: false, can_publish: true, viewer_key: `user:${ADMIN}` },
}

function id(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`
}

describe('discussion: GET /v1/comments/popular', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    const { db } = database

    await db.insert(users_copy).values({ user_id: AUTHOR, display_name: 'Анна', avatar_url: 'http://x/a.png' })
    const base = { author_id: AUTHOR, comments_enabled: true, published_at: new Date() }
    await db.insert(articles_copy).values([
      { ...base, article_id: id(1), title: 'Публичная', slug: 'public', visibility: 'public', status: 'published' },
      { ...base, article_id: id(2), title: 'Для участников', slug: 'members', visibility: 'members', status: 'published' },
      { ...base, article_id: id(3), title: 'Только автор', slug: 'author', visibility: 'author', status: 'published' },
      { ...base, article_id: id(4), title: 'Скрытая', slug: 'hidden', visibility: 'public', status: 'hidden' },
      { ...base, article_id: id(5), title: 'Черновик', slug: 'draft', visibility: 'public', status: 'draft' },
    ])
    const comment = (index: number, article: number, reaction_count: number, extra: Partial<typeof comments.$inferInsert> = {}) => ({
      id: id(100 + index),
      article_id: id(article),
      author_id: AUTHOR,
      body: `Комментарий ${index}`,
      reaction_count,
      ...extra,
    })
    await db.insert(comments).values([
      comment(1, 1, 5),
      comment(2, 2, 9),
      comment(3, 3, 7),
      comment(4, 4, 50),
      comment(5, 5, 50),
      comment(6, 1, 100, { status: 'deleted' }),
      comment(7, 1, 100, { status: 'hidden' }),
      comment(8, 1, 1, { author_id: OTHER, body: 'Из  ответа\n\nс переносами' }),
    ])
    for (let index = 20; index < 35; index += 1) await db.insert(comments).values(comment(index, 1, 2))

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

  async function popular(viewer: string) {
    const response = await app.inject({ method: 'GET', url: '/v1/comments/popular', headers: { 'x-test-viewer': viewer } })
    expect(response.statusCode).toBe(200)
    return popularCommentListSchema.parse(response.json())
  }

  it('гость: только публичные опубликованные статьи, не более 10, по убыванию реакций', async () => {
    const list = await popular('guest')
    expect(list).toHaveLength(10)
    expect(list.every((item) => item.article_slug === 'public')).toBe(true)
    expect(list[0]).toMatchObject({ id: id(101), reaction_count: 5, author_name: 'Анна', article_title: 'Публичная' })
    const counts = list.map((item) => item.reaction_count)
    expect(counts).toEqual([...counts].sort((a, b) => b - a))
    expect(list.map((item) => item.id)).not.toContain(id(106))
    expect(list.map((item) => item.id)).not.toContain(id(107))
  })

  it('участник видит статью «для участников»; закрытая автором — нет', async () => {
    const list = await popular('member')
    expect(list[0]).toMatchObject({ id: id(102), article_slug: 'members' })
    expect(list.map((item) => item.article_slug)).not.toContain('author')
  })

  it('автор и администратор видят закрытую статью, скрытые и черновики — нет', async () => {
    for (const viewer of ['author', 'admin']) {
      const list = await popular(viewer)
      expect(list.slice(0, 2).map((item) => item.article_slug)).toEqual(['members', 'author'])
      expect(list.map((item) => item.article_slug)).not.toContain('hidden')
      expect(list.map((item) => item.article_slug)).not.toContain('draft')
    }
  })

  it('автор без профиля получает нейтральное имя', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/comments/popular', headers: { 'x-test-viewer': 'guest' } })
    expect(response.statusCode).toBe(200)
    await database.db.insert(comments).values({ id: id(300), article_id: id(1), author_id: OTHER, body: 'Лидер', reaction_count: 1000 })
    expect((await popular('guest'))[0]).toMatchObject({ id: id(300), author_name: 'Участник', author_avatar_url: null })
  })

  it('toExcerpt схлопывает пробелы и режет по границе слова', () => {
    expect(toExcerpt('Из  ответа\n\nс переносами')).toBe('Из ответа с переносами')
    const long = toExcerpt('слово '.repeat(60))
    expect(long.length).toBeLessThanOrEqual(140)
    expect(long.endsWith('…')).toBe(true)
    expect(long.endsWith(' …')).toBe(false)
  })
})
