import { sql } from 'drizzle-orm'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { searchResponseSchema } from '@blog/contracts'
import type { SearchResponse, ServiceContext } from '@blog/contracts'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { errorHandler, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { articles, profiles, topics, users_copy } from '../../src/infra/db/schema.ts'
import { searchRoutes } from '../../src/modules/search/index.ts'

const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const TOPIC = '5c9d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a01'
const WORD = 'маяк'

const viewers: Record<string, ServiceContext> = {
  guest: { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' },
  member: { user_id: AUTHOR, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${AUTHOR}` },
}

function id(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`
}

describe('content: поиск на PostgreSQL', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    const { db } = database
    await db.insert(topics).values({ id: TOPIC, title: `Тема ${WORD}`, slug: 'mayaki', description: 'Берег', position: 1 })
    await db.insert(users_copy).values({ user_id: AUTHOR, public_number: 7, created_at: new Date('2026-01-01T00:00:00Z') })
    await db.insert(profiles).values({ user_id: AUTHOR, display_name: WORD, slug: 'mayak' })
    const vector = (text: string) => sql`to_tsvector('simple', ${text})`
    const base = { author_id: AUTHOR, topic_id: TOPIC, published_at: new Date('2026-10-01T00:00:00Z') }
    await db.insert(articles).values([
      { ...base, id: id(1), title: `Публичная статья про ${WORD}`, slug: 'public', status: 'published', visibility: 'public', search_vector: vector(`Публичная статья про ${WORD}`) },
      { ...base, id: id(2), title: `Черновик про ${WORD}`, slug: 'draft', status: 'draft', visibility: 'public', search_vector: vector(`Черновик про ${WORD}`) },
      { ...base, id: id(3), title: `Для участников про ${WORD}`, slug: 'members', status: 'published', visibility: 'members', search_vector: vector(`Для участников про ${WORD}`) },
      { ...base, id: id(4), title: `Скрытая про ${WORD}`, slug: 'hidden', status: 'hidden', visibility: 'public', search_vector: vector(`Скрытая про ${WORD}`) },
    ])

    app = Fastify()
    await app.register(requestContext, { logger: createLogger({ service: 'content-test', level: 'silent' }) })
    await app.register(errorHandler)
    app.decorateRequest('viewer', undefined as unknown as ServiceContext)
    app.addHook('onRequest', async (request) => {
      request.viewer = viewers[String(request.headers['x-test-viewer'])] ?? (viewers['guest'] as ServiceContext)
    })
    await app.register(searchRoutes, { database })
  }, 120_000)

  afterAll(async () => {
    await app.close()
    await database.close()
    await postgres.stop()
  })

  async function search(q: string, viewer = 'guest'): Promise<SearchResponse> {
    const response = await app.inject({ method: 'GET', url: `/v1/search?q=${encodeURIComponent(q)}`, headers: { 'x-test-viewer': viewer } })
    expect(response.statusCode).toBe(200)
    return searchResponseSchema.parse(response.json())
  }

  it('слово из заголовка находит публичную статью и не находит черновик, закрытую и скрытую', async () => {
    const page = await search(WORD)
    expect(page.articles.map((item) => item.title)).toEqual([`Публичная статья про ${WORD}`])
    expect(page.topics.map((item) => item.slug)).toEqual(['mayaki'])
    expect(page.people.map((item) => item.display_name)).toEqual([WORD])
  })

  it('участник видит статью «для участников», черновик и скрытую — нет', async () => {
    const titles = (await search(WORD, 'member')).articles.map((item) => item.title)
    expect(titles).toContain(`Для участников про ${WORD}`)
    expect(titles).not.toContain(`Черновик про ${WORD}`)
    expect(titles).not.toContain(`Скрытая про ${WORD}`)
  })

  it('короче двух символов — 422', async () => {
    expect((await app.inject({ method: 'GET', url: '/v1/search?q=м' })).statusCode).toBe(422)
  })
})
