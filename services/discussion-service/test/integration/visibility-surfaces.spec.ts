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
import { articles_copy, bookmarks, comments, users_copy } from '../../src/infra/db/schema.ts'
import { bookmarkRoutes } from '../../src/modules/bookmark/index.ts'
import { commentRoutes } from '../../src/modules/comment/index.ts'
import { reactionRoutes } from '../../src/modules/reaction/index.ts'
import { viewRoutes } from '../../src/modules/view/index.ts'

const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const OTHER = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99'
const ADMIN = '8a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a88'
const PUBLIC_ID = '00000000-0000-4000-8000-000000000001'
const MEMBERS_ID = '00000000-0000-4000-8000-000000000002'
const AUTHOR_ID = '00000000-0000-4000-8000-000000000003'

const viewers: Record<string, ServiceContext> = {
  guest: { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' },
  member: { user_id: OTHER, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${OTHER}` },
  author: { user_id: AUTHOR, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${AUTHOR}` },
  admin: { user_id: ADMIN, role: 'admin', is_restricted: false, can_publish: true, viewer_key: `user:${ADMIN}` },
}

const excerpts: Record<string, string[]> = {
  guest: ['фрагмент-открытый'],
  member: ['фрагмент-открытый', 'фрагмент-участникам'],
  author: ['фрагмент-автора', 'фрагмент-открытый', 'фрагмент-участникам'],
  admin: ['фрагмент-автора', 'фрагмент-открытый', 'фрагмент-участникам'],
}

describe('discussion: видимость комментариев, закладок, реакций и просмотров', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    const { db } = database
    await db.insert(users_copy).values([
      { user_id: AUTHOR, display_name: 'Анна' },
      { user_id: OTHER, display_name: 'Роман' },
      { user_id: ADMIN, display_name: 'Адам' },
    ])
    const base = { author_id: AUTHOR, comments_enabled: true, published_at: new Date('2026-10-01T00:00:00Z'), status: 'published' as const }
    await db.insert(articles_copy).values([
      { ...base, article_id: PUBLIC_ID, title: 'Открытая', slug: 'public', visibility: 'public' },
      { ...base, article_id: MEMBERS_ID, title: 'Для участников', slug: 'members', visibility: 'members' },
      { ...base, article_id: AUTHOR_ID, title: 'Личная', slug: 'personal', visibility: 'author' },
    ])
    await db.insert(comments).values([
      { id: '10000000-0000-4000-8000-000000000001', article_id: PUBLIC_ID, author_id: OTHER, body: 'фрагмент-открытый', reaction_count: 3 },
      { id: '10000000-0000-4000-8000-000000000002', article_id: MEMBERS_ID, author_id: OTHER, body: 'фрагмент-участникам', reaction_count: 2 },
      { id: '10000000-0000-4000-8000-000000000003', article_id: AUTHOR_ID, author_id: OTHER, body: 'фрагмент-автора', reaction_count: 1 },
    ])
    await db.insert(bookmarks).values([
      { user_id: OTHER, article_id: PUBLIC_ID, created_at: new Date('2026-10-03T00:00:00Z') },
      { user_id: OTHER, article_id: MEMBERS_ID, created_at: new Date('2026-10-02T00:00:00Z') },
      { user_id: OTHER, article_id: AUTHOR_ID, created_at: new Date('2026-10-01T00:00:00Z') },
    ])

    app = Fastify()
    await app.register(requestContext, { logger: createLogger({ service: 'discussion-test', level: 'silent' }) })
    await app.register(errorHandler)
    app.decorateRequest('viewer', undefined as unknown as ServiceContext)
    app.addHook('onRequest', async (request) => {
      request.viewer = viewers[String(request.headers['x-test-viewer'])] ?? (viewers['guest'] as ServiceContext)
    })
    await app.register(commentRoutes, { database })
    await app.register(bookmarkRoutes, { database })
    await app.register(reactionRoutes, { database })
    await app.register(viewRoutes, { database })
  }, 120_000)

  afterAll(async () => {
    await app.close()
    await database.close()
    await postgres.stop()
  })

  async function popular(viewer: string): Promise<string[]> {
    const response = await app.inject({ method: 'GET', url: '/v1/comments/popular', headers: { 'x-test-viewer': viewer } })
    expect(response.statusCode).toBe(200)
    return (response.json() as { excerpt: string }[]).map((item) => item.excerpt).sort()
  }

  it.each(['guest', 'member', 'author', 'admin'])('%s видит комментарии только доступных статей', async (viewer) => {
    expect(await popular(viewer)).toEqual(excerpts[viewer])
    const by_author = await app.inject({ method: 'GET', url: `/v1/users/${OTHER}/comments`, headers: { 'x-test-viewer': viewer } })
    expect(by_author.statusCode).toBe(200)
    const excerpts_by_author = (by_author.json() as { items: { excerpt: string }[] }).items.map((item) => item.excerpt).sort()
    expect(excerpts_by_author).toEqual(excerpts[viewer])
  })

  it('закрытая статья не отдаёт обсуждение, закладку, реакцию и просмотр', async () => {
    const guest_thread = await app.inject({ method: 'GET', url: `/v1/articles/${MEMBERS_ID}/comments`, headers: { 'x-test-viewer': 'guest' } })
    expect(guest_thread.statusCode).toBe(404)
    expect(guest_thread.body).not.toContain('фрагмент-участникам')

    const member_thread = await app.inject({ method: 'GET', url: `/v1/articles/${AUTHOR_ID}/comments`, headers: { 'x-test-viewer': 'member' } })
    expect(member_thread.statusCode).toBe(404)
    expect(member_thread.body).not.toContain('фрагмент-автора')

    const author_thread = await app.inject({ method: 'GET', url: `/v1/articles/${AUTHOR_ID}/comments`, headers: { 'x-test-viewer': 'author' } })
    expect(author_thread.statusCode).toBe(200)
    expect(author_thread.body).toContain('фрагмент-автора')

    const bookmarks_page = await app.inject({ method: 'GET', url: '/v1/bookmarks', headers: { 'x-test-viewer': 'member' } })
    expect(bookmarks_page.statusCode).toBe(200)
    expect(bookmarks_page.json()).toEqual({ article_ids: [PUBLIC_ID, MEMBERS_ID], next_cursor: null })

    const reaction = await app.inject({
      method: 'POST',
      url: '/v1/reactions',
      headers: { 'x-test-viewer': 'member', 'content-type': 'application/json' },
      payload: { target_type: 'article', target_id: AUTHOR_ID, kind: 'heart' },
    })
    expect(reaction.statusCode).toBe(404)

    const view = await app.inject({ method: 'POST', url: `/v1/articles/${MEMBERS_ID}/views`, headers: { 'x-test-viewer': 'guest' } })
    expect(view.statusCode).toBe(404)
    expect(view.body).not.toContain('Для участников')
  })
})
