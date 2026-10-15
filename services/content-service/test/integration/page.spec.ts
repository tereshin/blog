import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { errorHandler, idempotency, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import type { AdminPage, ServiceContext } from '@blog/contracts'
import { PageUpdatedV1, PageDeletedV1 } from '@blog/contracts'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { outbox, pages } from '../../src/infra/db/schema.ts'
import { composeContent } from '../../src/app.modules.ts'
import { pageRoutes } from '../../src/modules/page/index.ts'
import { seoRoutes } from '../../src/modules/seo/index.ts'
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const viewer = (
  user_id: string,
  role: ServiceContext['role'],
  extra: Partial<ServiceContext> = {},
): ServiceContext => ({
  user_id,
  role,
  viewer_key: `user:${user_id}`,
  can_publish: false,
  is_restricted: false,
  email_verified: true,
  ...extra,
})
const viewers: Record<string, ServiceContext> = {
  a: viewer(A, 'superadmin'),
  b: viewer(B, 'superadmin'),
  member: viewer(A, 'member'),
  admin: viewer(A, 'admin'),
  restricted: viewer(A, 'superadmin', { is_restricted: true }),
  unverified: viewer(A, 'superadmin', { email_verified: false }),
  guest: { role: 'guest', viewer_key: 'guest:1', can_publish: false, is_restricted: false },
}
const document = (text: string) => ({ blocks: [{ type: 'paragraph', data: { text } }] })
describe('simple pages real PostgreSQL', () => {
  let postgres: TestPostgres, database: DbHandle, app: FastifyInstance
  let saved: AdminPage
  function request(
    method: 'POST' | 'PATCH' | 'DELETE',
    body: unknown,
    id?: string,
    key = crypto.randomUUID(),
    who = 'a',
  ) {
    return app.inject({
      method,
      url: `/v1/admin/pages${id ? '/' + id : ''}`,
      headers: {
        'x-test-viewer': who,
        'x-idempotency-key': key,
        'content-type': 'application/json',
      },
      payload: JSON.stringify(body),
    })
  }
  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    // Concurrent replay and version checks need two established database connections.
    const first_client = await database.pool.connect()
    try {
      const second_client = await database.pool.connect()
      second_client.release()
    } finally {
      first_client.release()
    }
    app = Fastify()
    await app.register(requestContext, {
      logger: createLogger({ service: 'pages-test', level: 'error' }),
    })
    await app.register(idempotency)
    await app.register(errorHandler)
    // Fastify decorator is populated by the following onRequest test hook.
    app.decorateRequest('viewer', undefined as unknown as ServiceContext)
    app.addHook('onRequest', async (req) => {
      req.viewer =
        viewers[String(req.headers['x-test-viewer'])] ?? viewers.guest ?? viewer(A, 'guest')
    })
    const modules = composeContent({
      database,
      media_url: 'https://media.test/files',
      public_origin: 'https://blog.test',
      app_env: 'prod',
      media_urls: ['https://media.test/files'],
      lookupFile: async (url) =>
        url.startsWith('https://media.test/files/')
          ? { uploader_id: url.includes('file-b') ? B : A }
          : null,
    })
    await app.register(pageRoutes, { controller: modules.page })
    await app.register(seoRoutes, { controller: modules.seo })
  }, 120_000)
  afterAll(async () => {
    await app?.close()
    await database?.close()
    await postgres?.stop()
  })
  it('checks current role, restrictions and verification before resolving resources', async () => {
    for (const [who, status] of [
      ['guest', 401],
      ['member', 403],
      ['admin', 403],
      ['restricted', 403],
      ['unverified', 403],
    ] as const) {
      expect(
        (await request('POST', { title: 'X', slug: 'denied' }, undefined, crypto.randomUUID(), who))
          .statusCode,
      ).toBe(status)
      expect(
        (await app.inject({ url: '/v1/admin/pages', headers: { 'x-test-viewer': who } }))
          .statusCode,
      ).toBe(status)
    }
    expect(await database.db.select().from(pages)).toHaveLength(0)
  })
  it('creates draft once under concurrent replay and keeps public API and SEO neutral', async () => {
    const key = crypto.randomUUID(),
      body = { title: 'Contacts', slug: 'contacts', blocks: document('Draft secret') }
    const replies = await Promise.all([
      request('POST', body, undefined, key),
      request('POST', body, undefined, key),
    ])
    for (const reply of replies) expect(reply.statusCode, reply.body).toBe(201)
    const first = replies[0],
      second = replies[1]
    if (!first || !second) throw new Error('Missing replies')
    saved = first.json<AdminPage>()
    expect(second.json()).toEqual(saved)
    expect(saved.status).toBe('draft')
    expect(await database.db.select().from(pages)).toHaveLength(1)
    expect((await app.inject('/v1/pages/contacts')).statusCode).toBe(404)
    const seo = (await app.inject('/v1/seo?path=/pages/contacts')).json()
    expect(seo.status).toBe(404)
    expect(seo.body_text).toBe('')
    expect(JSON.stringify(seo)).not.toContain('Draft secret')
    expect(
      (await request('POST', { ...body, title: 'Different' }, undefined, key)).json().code,
    ).toBe('idempotency_key_conflict')
    expect((await request('POST', body, undefined, key, 'admin')).statusCode).toBe(403)
    const events = await database.db.select().from(outbox)
    expect(events).toHaveLength(1)
    expect(PageUpdatedV1.safeParse(events[0]?.payload).success).toBe(true)
  })
  it('atomically publishes content, sanitizes inline HTML and provides SEO/sitemap', async () => {
    const reply = await request(
      'PATCH',
      {
        expected_version: saved.version,
        status: 'published',
        blocks: document('<b>Live text</b><script>bad()</script>'),
      },
      saved.id,
    )
    expect(reply.statusCode, reply.body).toBe(200)
    saved = reply.json()
    expect(saved.version).toBe(2)
    const pub = (await app.inject('/v1/pages/contacts')).json()
    expect(pub.title).toBe('Contacts')
    expect(JSON.stringify(pub)).not.toContain('<script>')
    expect(pub.created_by).toBeUndefined()
    const seo = (await app.inject('/v1/seo?path=/pages/contacts')).json()
    expect(seo.status).toBe(200)
    expect(seo.body_text).toContain('Live text')
    expect(seo.og_type).toBe('website')
    const sitemap = (await app.inject('/internal/seo/sitemap?part=pages-start')).json()
    expect(sitemap.body).toContain('https://blog.test/pages/contacts')
  })
  it('rejects stale writes and empty published saves, and does not implicitly unpublish', async () => {
    expect(
      (await request('PATCH', { expected_version: 1, title: 'Stale' }, saved.id)).json().code,
    ).toBe('page_version_conflict')
    expect(
      (
        await request(
          'PATCH',
          { expected_version: saved.version, blocks: { blocks: [] } },
          saved.id,
        )
      ).json().code,
    ).toBe('page_not_publishable')
    expect(
      (await request('PATCH', { expected_version: saved.version, slug: 'other' }, saved.id)).json()
        .code,
    ).toBe('page_slug_locked')
    const empty_list = await request(
      'PATCH',
      {
        expected_version: saved.version,
        blocks: {
          blocks: [
            {
              type: 'list',
              data: { style: 'ordered', items: [{ content: ' ', items: ['<br>'] }] },
            },
          ],
        },
      },
      saved.id,
    )
    expect(empty_list.json().code).toBe('page_not_publishable')
    const key = crypto.randomUUID(),
      body = { expected_version: saved.version, title: 'Updated contacts' }
    const reply = await request('PATCH', body, saved.id, key)
    saved = reply.json()
    expect(saved.status).toBe('published')
    expect((await request('PATCH', body, saved.id, key)).json()).toEqual(saved)
    expect((await app.inject('/v1/pages/contacts')).json().title).toBe('Updated contacts')
    const count = await database.db.select().from(outbox)
    expect(count).toHaveLength(3)
  })
  it('preserves files placed by a different admin but refuses new foreign references and hostile prefixes', async () => {
    const image = { type: 'image', data: { file: { url: 'https://media.test/files/file-a.png' } } }
    saved = (
      await request(
        'PATCH',
        { expected_version: saved.version, blocks: { blocks: [image] } },
        saved.id,
      )
    ).json()
    const reply = await request(
      'PATCH',
      { expected_version: saved.version, title: 'Edited by B' },
      saved.id,
      crypto.randomUUID(),
      'b',
    )
    expect(reply.statusCode, reply.body).toBe(200)
    saved = reply.json()
    for (const url of [
      'https://media.test/files/unplaced-a.png',
      'https://media.test.evil/files/file-b.png',
    ]) {
      const rejected = await request(
        'PATCH',
        {
          expected_version: saved.version,
          blocks: { blocks: [{ type: 'image', data: { file: { url } } }] },
        },
        saved.id,
        crypto.randomUUID(),
        'b',
      )
      expect(rejected.json().code).toBe('foreign_file')
    }
    saved = (
      await request(
        'PATCH',
        { expected_version: saved.version, blocks: document('Removed image') },
        saved.id,
        crypto.randomUUID(),
        'b',
      )
    ).json()
    expect(
      (
        await request(
          'PATCH',
          { expected_version: saved.version, blocks: { blocks: [image] } },
          saved.id,
          crypto.randomUUID(),
          'b',
        )
      ).json().code,
    ).toBe('foreign_file')
  })
  it('serializes distinct operations against a shared version', async () => {
    const results = await Promise.all(
      ['One', 'Two'].map((title) =>
        request('PATCH', { title, expected_version: saved.version }, saved.id),
      ),
    )
    expect(results.map((r) => r.statusCode).sort()).toEqual([200, 409])
    const success = results.find((r) => r.statusCode === 200)
    if (!success) throw new Error('No successful update')
    saved = success.json()
  })
  it('unpublishes without releasing slug and soft deletes with stable replay', async () => {
    const first_publication = saved.published_at
    saved = (
      await request('PATCH', { expected_version: saved.version, status: 'draft' }, saved.id)
    ).json()
    expect((await app.inject('/v1/pages/contacts')).statusCode).toBe(404)
    expect((await app.inject('/internal/seo/sitemap?part=pages-start')).json().body).not.toContain(
      '/pages/contacts',
    )
    expect(
      (
        await request(
          'PATCH',
          { expected_version: saved.version, slug: 'another-address' },
          saved.id,
        )
      ).json().code,
    ).toBe('page_slug_locked')
    saved = (
      await request('PATCH', { expected_version: saved.version, status: 'published' }, saved.id)
    ).json()
    expect(saved.published_at).toBe(first_publication)
    const key = crypto.randomUUID(),
      body = { expected_version: saved.version }
    expect((await request('DELETE', body, saved.id, key)).statusCode).toBe(204)
    expect((await request('DELETE', body, saved.id, key)).statusCode).toBe(204)
    expect((await app.inject('/v1/pages/contacts')).statusCode).toBe(404)
    expect(
      (await app.inject({ url: `/v1/admin/pages/${saved.id}`, headers: { 'x-test-viewer': 'a' } }))
        .statusCode,
    ).toBe(404)
    expect((await request('POST', { title: 'Reuse', slug: 'contacts' })).json().code).toBe(
      'page_slug_taken',
    )
    const events = await database.db
      .select()
      .from(outbox)
      .where(eq(outbox.name, 'content.page.deleted'))
    expect(events).toHaveLength(1)
    expect(PageDeletedV1.safeParse(events[0]?.payload).success).toBe(true)
  })
  it('paginates metadata only and binds cursors to filters', async () => {
    for (const slug of ['page-one', 'page-two', 'page-three'])
      expect((await request('POST', { title: slug, slug })).statusCode).toBe(201)
    const first = (
      await app.inject({ url: '/v1/admin/pages?limit=2', headers: { 'x-test-viewer': 'a' } })
    ).json()
    expect(first.items).toHaveLength(2)
    expect(first.items[0].blocks).toBeUndefined()
    expect(first.next_cursor).toBeTruthy()
    const next = (
      await app.inject({
        url: `/v1/admin/pages?limit=2&cursor=${first.next_cursor}`,
        headers: { 'x-test-viewer': 'a' },
      })
    ).json()
    expect(next.items).toHaveLength(1)
    expect(
      (
        await app.inject({
          url: `/v1/admin/pages?status=draft&cursor=${first.next_cursor}`,
          headers: { 'x-test-viewer': 'a' },
        })
      ).statusCode,
    ).toBe(400)
  })
})
