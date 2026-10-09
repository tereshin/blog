import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { errorHandler, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { articles, topics } from '../../src/infra/db/schema.ts'
import { prerenderRoutes } from '../../src/modules/article/index.ts'

const TOPIC = '5c9d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a01'
const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const PUBLIC_ID = '00000000-0000-4000-8000-000000000401'
const DRAFT_ID = '00000000-0000-4000-8000-000000000402'

const blocks = { time: 1, blocks: [{ type: 'paragraph', data: { text: 'Текст для робота' } }], version: '2.28.0' }

describe('content: страница для робота', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    await database.db.insert(topics).values({ id: TOPIC, title: 'Технологии', slug: 'tech', position: 0 })
    await database.db.insert(articles).values([
      {
        id: PUBLIC_ID,
        author_id: AUTHOR,
        topic_id: TOPIC,
        title: 'Публичная статья',
        slug: 'public-post',
        status: 'published',
        visibility: 'public',
        published_at: new Date(),
        excerpt: 'Короткое описание',
        first_image_url: 'https://cdn.example/cover.png',
        blocks,
      },
      {
        id: DRAFT_ID,
        author_id: AUTHOR,
        topic_id: TOPIC,
        title: 'Черновик',
        slug: 'draft-post',
        status: 'draft',
        visibility: 'public',
        excerpt: 'секрет',
        blocks,
      },
    ])
    app = Fastify()
    await app.register(requestContext, { logger: createLogger({ service: 'content-test', level: 'silent' }) })
    await app.register(errorHandler)
    await app.register(prerenderRoutes, { database })
  }, 120_000)

  afterAll(async () => {
    await app.close()
    await database.close()
    await postgres.stop()
  })

  it('публичная статья отдаёт заголовок, описание и текст, черновик — только название площадки', async () => {
    const published = await app.inject({ method: 'GET', url: '/internal/prerender/article/public-post' })
    expect(published.statusCode).toBe(200)
    expect(published.json()).toMatchObject({
      title: 'Публичная статья',
      description: 'Короткое описание',
      image_url: 'https://cdn.example/cover.png',
      text: 'Текст для робота',
    })

    const draft = await app.inject({ method: 'GET', url: '/internal/prerender/article/draft-post' })
    expect(draft.statusCode).toBe(200)
    expect(draft.json()).toMatchObject({ title: 'Блог', text: '' })
    expect(draft.json().description).not.toContain('секрет')
  })
})
