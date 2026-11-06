import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { ServiceContext } from '@blog/contracts'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { articles_copy, outbox, views } from '../../src/infra/db/schema.ts'
import { ArticleSnapshotRepository, ArticleSnapshotService } from '../../src/modules/article-snapshot/index.ts'
import { ViewEvents, ViewRepository, ViewService } from '../../src/modules/view/index.ts'

const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const MEMBER = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a91'
const ADMIN = '8a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a88'
const ARTICLE = '7a1c2d30-1111-4a11-8a11-000000000010'

function viewer(patch: Partial<ServiceContext> & Pick<ServiceContext, 'role' | 'viewer_key'>): ServiceContext {
  return { is_restricted: false, can_publish: true, ...patch }
}

describe('discussion: просмотры (PostgreSQL в контейнере)', () => {
  let postgres: TestPostgres
  let database: DbHandle

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    await database.db.insert(articles_copy).values({
      article_id: ARTICLE,
      author_id: AUTHOR,
      title: 'Заметка',
      slug: 'zametka',
      visibility: 'public',
      status: 'published',
      comments_enabled: true,
      published_at: new Date('2026-10-01T00:00:00.000Z'),
    })
  }, 120_000)

  afterAll(async () => {
    await database?.close()
    await postgres?.stop()
  })

  beforeEach(async () => {
    await database.db.delete(views)
    await database.db.delete(outbox)
    await database.db.update(articles_copy).set({ visibility: 'public', status: 'published' }).where(eq(articles_copy.article_id, ARTICLE))
  })

  it('каждый заход гостя, участника, автора и модератора добавляет просмотр', async () => {
    const service = new ViewService(new ViewRepository(database.db), new ArticleSnapshotService(new ArticleSnapshotRepository()), new ViewEvents())
    const member = viewer({ user_id: MEMBER, role: 'member', viewer_key: `user:${MEMBER}` })
    const guest = viewer({ role: 'guest', can_publish: false, viewer_key: 'guest:device' })

    const author = await service.record({
      viewer: viewer({ user_id: AUTHOR, role: 'member', viewer_key: `user:${AUTHOR}` }),
      article_id: ARTICLE,
      correlation_id: 'c',
    })
    expect(author).toEqual({ counted: true, view_count: 1 })

    const admin = await service.record({
      viewer: viewer({ user_id: ADMIN, role: 'admin', viewer_key: `user:${ADMIN}` }),
      article_id: ARTICLE,
      context: 'moderation',
      correlation_id: 'c',
    })
    expect(admin).toEqual({ counted: true, view_count: 2 })

    const [first, second] = await Promise.all([
      service.record({ viewer: guest, article_id: ARTICLE, correlation_id: 'c' }),
      service.record({ viewer: guest, article_id: ARTICLE, correlation_id: 'c' }),
    ])
    expect(first.counted).toBe(true)
    expect(second.counted).toBe(true)
    expect([first.view_count, second.view_count].sort()).toEqual([3, 4])

    const again = await service.record({ viewer: guest, article_id: ARTICLE, correlation_id: 'c' })
    expect(again).toEqual({ counted: true, view_count: 5 })

    const opened = await service.record({ viewer: member, article_id: ARTICLE, context: 'moderation', correlation_id: 'c' })
    expect(opened.counted).toBe(true)
    expect(opened.view_count).toBe(6)

    const [guest_views] = await database.db.select().from(views).where(eq(views.viewer_key, 'guest:device'))
    expect(guest_views?.times).toBe(3)

    const names = (await database.db.select({ name: outbox.name }).from(outbox)).map((row) => row.name)
    expect(names.filter((name) => name === 'discussion.article_view.counted')).toHaveLength(6)
    expect(names.filter((name) => name === 'discussion.article_counters.updated')).toHaveLength(6)
  })

  it.each([
    { status: 'published', visibility: 'members' },
    { status: 'published', visibility: 'author' },
    { status: 'hidden', visibility: 'public' },
    { status: 'draft', visibility: 'public' },
    { status: 'deleted', visibility: 'public' },
  ] as const)('не засчитывает недоступную гостю статью: $status/$visibility', async (access) => {
    await database.db.update(articles_copy).set(access).where(eq(articles_copy.article_id, ARTICLE))
    const service = new ViewService(new ViewRepository(database.db), new ArticleSnapshotService(new ArticleSnapshotRepository()), new ViewEvents())
    await expect(service.record({
      viewer: viewer({ role: 'guest', can_publish: false, viewer_key: 'guest:device' }),
      article_id: ARTICLE,
      correlation_id: 'c',
    })).rejects.toThrow('Статья недоступна')
    expect(await database.db.select().from(views)).toHaveLength(0)
    expect(await database.db.select().from(outbox)).toHaveLength(0)
  })
})
