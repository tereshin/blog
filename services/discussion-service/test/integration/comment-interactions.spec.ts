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
import { commentRoutes, commentInteractionRoutes } from '../../src/modules/comment/index.ts'
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const ARTICLE = id(1),
  PRIVATE = id(2),
  AUTHOR = id(3),
  MEMBER = id(4),
  ADMIN = id(5),
  ROOT = id(100)
const contexts: Record<string, ServiceContext> = {
  guest: { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest' },
  author: {
    role: 'member',
    user_id: AUTHOR,
    is_restricted: false,
    can_publish: true,
    viewer_key: 'author',
    email_verified: true,
  },
  member: {
    role: 'member',
    user_id: MEMBER,
    is_restricted: false,
    can_publish: true,
    viewer_key: 'member',
    email_verified: true,
  },
  admin: {
    role: 'admin',
    user_id: ADMIN,
    is_restricted: false,
    can_publish: true,
    viewer_key: 'admin',
    email_verified: true,
  },
}
describe('comment interface API', () => {
  let postgres: TestPostgres, database: DbHandle, app: FastifyInstance
  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    await database.pool.query(
      "insert into articles_copy(article_id,author_id,title,slug,visibility,status,comments_enabled) values ($1,$3,'Public','public','public','published',true), ($2,$3,'Private','private','author','published',true)",
      [ARTICLE, PRIVATE, AUTHOR],
    )
    await database.pool.query(
      "insert into users_copy(user_id,display_name) values ($1,'Author'),($2,'Member'),($3,'Admin')",
      [AUTHOR, MEMBER, ADMIN],
    )
    for (let n = 0; n < 25; n++)
      await database.pool.query(
        'insert into comments(id,article_id,author_id,body,reaction_count,created_at) values ($1,$2,$3,$4,$5,$6)',
        [id(100 + n), ARTICLE, AUTHOR, `root ${n}`, n % 4, new Date(2026, 9, 1 + n)],
      )
    for (let n = 0; n < 25; n++)
      await database.pool.query(
        'insert into comments(id,article_id,author_id,parent_id,body,reaction_count,created_at) values ($1,$2,$3,$4,$5,$6,$7)',
        [id(200 + n), ARTICLE, MEMBER, ROOT, `reply ${n}`, n % 3, new Date(2026, 9, 1 + n)],
      )
    await database.pool.query('update comments set reply_count=25 where id=$1', [ROOT])
    await database.pool.query(
      "insert into comments(id,article_id,author_id,body) values ($1,$2,$3,'private comment')",
      [id(300), PRIVATE, AUTHOR],
    )
    await database.pool.query(
      "insert into reactions(user_id,target_type,target_id,kind,created_at) values ($1,'comment',$3,'heart','2026-10-01'),($2,'comment',$3,'heart','2026-10-02')",
      [AUTHOR, MEMBER, ROOT],
    )
    app = Fastify()
    await app.register(requestContext, {
      logger: createLogger({ service: 'comments-test', level: 'silent' }),
    })
    await app.register(errorHandler)
    app.decorateRequest('viewer', undefined as unknown as ServiceContext)
    app.addHook('onRequest', async (request) => {
      request.viewer =
        contexts[String(request.headers['x-viewer'])] ?? (contexts.guest as ServiceContext)
    })
    await app.register(commentRoutes, {
      database,
      lookup_file: async (url) =>
        url === 'https://media.test/uploads/owned' ? { uploader_id: MEMBER, kind: 'image' } : null,
    })
    await app.register(commentInteractionRoutes, { database })
  }, 120000)
  afterAll(async () => {
    await app?.close()
    await database?.close()
    await postgres?.stop()
  })
  const get = (url: string, viewer = 'member') =>
    app.inject({ method: 'GET', url, headers: { 'x-viewer': viewer } })
  const mutate = (
    method: 'PUT' | 'DELETE' | 'POST' | 'PATCH',
    url: string,
    payload?: object,
    viewer = 'member',
  ) => app.inject({ method, url, headers: { 'x-viewer': viewer }, ...(payload ? { payload } : {}) })
  it('sorts all roots and pages with a cursor bound to sort and article', async () => {
    for (const sort of ['best', 'newest', 'oldest']) {
      const first = await get(
        `/v1/articles/${ARTICLE}/comments?sort=${sort}&include_replies=false&limit=3`,
      )
      expect(first.statusCode).toBe(200)
      const body = first.json()
      expect(body.comments).toHaveLength(3)
      expect(body.comments.every((item: { replies: unknown[] }) => !item.replies.length)).toBe(true)
      const second = await get(
        `/v1/articles/${ARTICLE}/comments?sort=${sort}&include_replies=false&limit=3&cursor=${body.next_cursor}`,
      )
      expect(second.statusCode).toBe(200)
      expect(
        second
          .json()
          .comments.every(
            (item: { id: string }) =>
              !body.comments.some((other: { id: string }) => other.id === item.id),
          ),
      ).toBe(true)
      if (sort === 'oldest')
        expect(body.comments.map((item: { id: string }) => item.id)).toEqual([
          id(100),
          id(101),
          id(102),
        ])
      if (sort === 'newest')
        expect(body.comments.map((item: { id: string }) => item.id)).toEqual([
          id(124),
          id(123),
          id(122),
        ])
      if (sort === 'best')
        expect(body.comments.map((item: { id: string }) => item.id)).toEqual([
          id(123),
          id(119),
          id(115),
        ])
      expect(
        (
          await get(
            `/v1/articles/${ARTICLE}/comments?sort=${sort === 'best' ? 'oldest' : 'best'}&cursor=${body.next_cursor}`,
          )
        ).statusCode,
      ).toBe(422)
      expect(
        (
          await get(
            `/v1/articles/${PRIVATE}/comments?sort=${sort}&cursor=${body.next_cursor}`,
            'author',
          )
        ).statusCode,
      ).toBe(422)
    }
    expect((await get(`/v1/articles/${ARTICLE}/comments?cursor=broken`)).statusCode).toBe(422)
  })
  it('paginates replies independently, resolves any root/reply, and protects private comments', async () => {
    const page = await get(`/v1/comments/${ROOT}/replies?limit=3&sort=newest`)
    expect(page.statusCode).toBe(200)
    expect(page.json().comments.map((item: { id: string }) => item.id)).toEqual([
      id(224),
      id(223),
      id(222),
    ])
    expect(
      (
        await get(
          `/v1/comments/${ROOT}/replies?limit=3&sort=newest&cursor=${page.json().next_cursor}`,
        )
      ).json().comments[0].id,
    ).toBe(id(221))
    const thread = await get(`/v1/comments/${id(224)}/thread`)
    expect(thread.json()).toMatchObject({
      article_id: ARTICLE,
      root: { id: ROOT, reply_count: 25 },
      target: { id: id(224), body: 'reply 24' },
    })
    for (const path of ['thread', 'replies', 'reactors?kind=heart'])
      expect((await get(`/v1/comments/${id(300)}/${path}`)).statusCode).toBe(404)
  })
  it('stores bookmarks once, returns viewer state and saved list, and removes inaccessible bookmarks', async () => {
    for (let n = 0; n < 2; n++)
      expect((await mutate('PUT', `/v1/comments/${ROOT}/bookmark`)).json()).toEqual({
        is_bookmarked: true,
      })
    expect((await get(`/v1/comments/${ROOT}/thread`)).json().root.is_bookmarked).toBe(true)
    expect((await get('/v1/comments/bookmarks')).json().items).toHaveLength(1)
    expect((await get(`/v1/comments/${ROOT}/thread`, 'guest')).json().root.is_bookmarked).toBe(
      false,
    )
    expect((await mutate('PUT', `/v1/comments/${id(300)}/bookmark`)).statusCode).toBe(404)
    expect((await mutate('DELETE', `/v1/comments/${ROOT}/bookmark`)).json()).toEqual({
      is_bookmarked: false,
    })
    expect(
      (await mutate('PUT', `/v1/comments/${ROOT}/bookmark`, undefined, 'guest')).statusCode,
    ).toBe(401)
  })
  it('lists reactors by kind with pagination, no duplicate users, and rejects cross-kind cursors', async () => {
    const page = await get(`/v1/comments/${ROOT}/reactors?kind=heart&limit=1`)
    expect(page.json().items[0].user_id).toBe(MEMBER)
    const cursor = page.json().next_cursor
    expect(
      (await get(`/v1/comments/${ROOT}/reactors?kind=heart&limit=1&cursor=${cursor}`)).json()
        .items[0].user_id,
    ).toBe(AUTHOR)
    expect((await get(`/v1/comments/${ROOT}/reactors?kind=fire&cursor=${cursor}`)).statusCode).toBe(
      422,
    )
  })
  it('deduplicates reports and reviews them atomically with moderation events; only staff can review', async () => {
    const first = await mutate('POST', `/v1/comments/${id(101)}/reports`, {
      reason: 'Spam comment',
    })
    expect(first.statusCode).toBe(201)
    const second = await mutate('POST', `/v1/comments/${id(101)}/reports`, {
      reason: 'Another reason',
    })
    expect(second.json().id).toBe(first.json().id)
    expect((await get('/v1/moderation/comments/reports')).statusCode).toBe(403)
    expect((await get('/v1/moderation/comments/reports', 'admin')).json().items).toHaveLength(1)
    const reviewed = await mutate(
      'PATCH',
      `/v1/moderation/comments/reports/${first.json().id}`,
      { action: 'hide' },
      'admin',
    )
    expect(reviewed.statusCode).toBe(200)
    expect(reviewed.json().status).toBe('reviewed')
    expect((await get('/v1/moderation/comments/reports', 'admin')).json().items).toHaveLength(0)
    const rows = await database.pool.query('select name from outbox')
    expect(rows.rows.map((row) => row.name)).toContain('discussion.comment.hidden')
    expect(
      (await mutate('POST', `/v1/comments/${ROOT}/reports`, { reason: 'Own report' }, 'author'))
        .statusCode,
    ).toBe(403)
  })
  it('subscribes, persists safe media/mentions, canonicalizes names and places recipients in outbox', async () => {
    expect(
      (await mutate('PUT', `/v1/comments/subscriptions/${ARTICLE}`, undefined, 'admin')).json(),
    ).toEqual({ is_subscribed: true })
    expect((await get(`/v1/comments/subscriptions/${ARTICLE}`, 'admin')).json()).toEqual({
      is_subscribed: true,
    })
    const created = await mutate('POST', `/v1/articles/${ARTICLE}/comments`, {
      body: 'Hello',
      media: [{ url: 'https://media.test/uploads/owned', alt: 'Picture' }],
      mentions: [{ user_id: ADMIN, display_name: 'Forged' }],
    })
    expect(created.statusCode).toBe(201)
    expect(created.json().media).toHaveLength(1)
    expect(created.json().mentions).toEqual([{ user_id: ADMIN, display_name: 'Admin' }])
    const rows = await database.pool.query(
      "select payload from outbox where name='discussion.comment.created'",
    )
    expect(rows.rows.at(-1)?.payload).toMatchObject({
      subscriber_ids: [ADMIN],
      mention_ids: [ADMIN],
    })
    expect(
      (
        await mutate('POST', `/v1/articles/${ARTICLE}/comments`, {
          body: 'Unsafe',
          media: [{ url: 'https://evil.test/file', alt: '' }],
        })
      ).statusCode,
    ).toBe(422)
    expect(
      (
        await mutate('POST', `/v1/articles/${ARTICLE}/comments`, {
          body: 'Missing',
          mentions: [{ user_id: id(999), display_name: 'Nobody' }],
        })
      ).statusCode,
    ).toBe(422)
    expect(
      (await mutate('DELETE', `/v1/comments/subscriptions/${ARTICLE}`, undefined, 'admin')).json(),
    ).toEqual({ is_subscribed: false })
    expect((await get('/v1/comments/mentions?q=Mem')).json()).toEqual([
      { user_id: MEMBER, display_name: 'Member', avatar_url: null },
    ])
    expect((await get('/v1/comments/mentions?q=Mem', 'guest')).statusCode).toBe(401)
  })
})
