import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { newEventId, processEvent } from '@blog/broker'
import type { ServiceContext } from '@blog/contracts'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { articles, follows, profiles, topics, users_copy } from '../../src/infra/db/schema.ts'
import {
  applyDeletedUser,
  DELETED_USERS_CONSUMER,
} from '../../src/modules/copies/deleted-users.consumer.ts'
import { CopiesHandler } from '../../src/modules/copies/index.ts'
import { ProfileRepository } from '../../src/modules/profile/profile.repository.ts'
import { ProfileListsRepository } from '../../src/modules/profile/profile.lists.ts'
import { SearchRepository } from '../../src/modules/search/search.repository.ts'
import { FollowRepository } from '../../src/modules/follow/follow.repository.ts'
import { CrawlService, SeoRepository, SeoService } from '../../src/modules/seo/index.ts'

const DELETED = '11111111-1111-4111-8111-111111111111'
const LIVE = '22222222-2222-4222-8222-222222222222'
const TOPIC = '33333333-3333-4333-8333-333333333333'
const GUEST: ServiceContext = {
  role: 'guest',
  can_publish: false,
  is_restricted: false,
  viewer_key: 'guest:test',
}
const options = { public_origin: 'https://blog.test', app_env: 'prod' as const }

describe('deleted entities stay out of public discovery and SEO', () => {
  let postgres: TestPostgres
  let database: DbHandle
  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    await database.db.insert(users_copy).values([
      { user_id: DELETED, public_number: 1, created_at: new Date() },
      { user_id: LIVE, public_number: 2, created_at: new Date() },
    ])
    await database.db.insert(profiles).values([
      { user_id: DELETED, display_name: 'Удалённый маяк', slug: 'removed', reputation: 100 },
      { user_id: LIVE, display_name: 'Живой маяк', slug: 'live', reputation: 1 },
    ])
    await database.db.insert(follows).values([
      { follower_id: LIVE, target_type: 'user', target_id: DELETED },
      { follower_id: DELETED, target_type: 'user', target_id: LIVE },
    ])
    await database.db
      .insert(topics)
      .values({ id: TOPIC, title: 'Путешествия', slug: 'travels', position: 0 })
    await database.db.insert(articles).values(
      ['published', 'deleted', 'hidden', 'draft'].map((status, index) => ({
        id: `44444444-4444-4444-8444-${String(index + 1).padStart(12, '0')}`,
        author_id: LIVE,
        topic_id: TOPIC,
        slug: status,
        title: `${status} маяк`,
        excerpt: `Отрывок ${status}`,
        status: status as 'published' | 'deleted' | 'hidden' | 'draft',
        visibility: 'public' as const,
        published_at: new Date(),
      })),
    )
    await database.db.insert(articles).values({
      id: '55555555-5555-4555-8555-555555555555',
      author_id: LIVE,
      topic_id: TOPIC,
      slug: 'members',
      title: 'Секретная статья',
      status: 'published',
      visibility: 'members',
      published_at: new Date(),
    })
    const event = {
      event_id: newEventId(),
      name: 'identity.user.restricted',
      occurred_at: new Date().toISOString(),
      correlation_id: 'deletion',
      causation_id: null,
      version: 1,
      user_id: DELETED,
      public_number: 1,
      role: 'member',
      can_publish: false,
      is_restricted: true,
      is_deleted: true,
      created_at: new Date().toISOString(),
    }
    // Simulate the old deployed consumer acknowledging the event without the new field.
    await processEvent(database.db, 'content-copies-users', event, async (tx, delivered) => {
      await new CopiesHandler().handle(tx, { ...delivered, is_deleted: false })
    })
    const stale = await new ProfileRepository(database.db).findBySlug('removed', undefined)
    expect(stale).not.toBeNull()
    expect(
      await processEvent(database.db, 'content-copies-users', event, new CopiesHandler().handle),
    ).toBe('duplicate')
    expect(await processEvent(database.db, DELETED_USERS_CONSUMER, event, applyDeletedUser)).toBe(
      'ok',
    )
    expect(await processEvent(database.db, DELETED_USERS_CONSUMER, event, applyDeletedUser)).toBe(
      'duplicate',
    )
  }, 120_000)
  afterAll(async () => {
    await database?.close()
    await postgres?.stop()
  })

  it('не показывает удалённый профиль в рейтинге и поиске до применения лимита', async () => {
    const rating = await new ProfileListsRepository(database.db).rating(null, 1)
    expect(rating.map((row) => row.user_id)).toEqual([LIVE])
    const people = await new SearchRepository(database.db).findPeople('маяк')
    expect(people.map((row) => row.user_id)).toEqual([LIVE])
  })
  it('не открывает удалённый профиль по slug, UUID или номеру', async () => {
    const repository = new ProfileRepository(database.db)
    expect(await repository.findBySlug('removed', undefined)).toBeNull()
    expect(await repository.findByUserId(DELETED, undefined)).toBeNull()
    expect(await repository.findByPublicNumber(1, undefined)).toBeNull()
    expect(await repository.findByUserId(LIVE, undefined)).not.toBeNull()
  })
  it('не показывает удалённого участника в подписках и подписчиках', async () => {
    const repository = new ProfileListsRepository(database.db)
    expect(await repository.listFollowers(LIVE, null, 10)).toEqual([])
    expect(await repository.listFollowing(LIVE, null, 10)).toEqual([])
    const follow = new FollowRepository(database.db)
    expect(await follow.userExists(DELETED)).toBe(false)
    expect(await follow.list(LIVE, {})).toEqual([])
  })
  it('не включает удалённый профиль и статью в SEO и sitemap', async () => {
    const repository = new SeoRepository(database.db)
    const seo = new SeoService(repository, options)
    expect((await seo.page('/u/removed')).status).toBe(404)
    expect((await seo.page('/u/1')).status).toBe(404)
    expect((await seo.page('/p/deleted')).status).toBe(404)
    const crawl = new CrawlService(database.db, repository, options)
    const people = await crawl.sitemap('profiles-start')
    expect(people?.body).not.toContain('/u/removed')
    expect(people?.body).toContain('/u/live')
    const posts = await crawl.sitemap('articles-start')
    expect(posts?.body).toContain('/p/published')
    expect(posts?.body).not.toContain('/p/deleted')
  })
  it('в HTML темы идут только превью публичных опубликованных статей', async () => {
    const seo = new SeoService(new SeoRepository(database.db), options)
    const page = await seo.page('/t/travels')
    expect(page.body_text).toContain('published маяк')
    for (const private_text of ['deleted маяк', 'hidden маяк', 'draft маяк', 'Секретная статья'])
      expect(page.body_text).not.toContain(private_text)
    const list = page.structured_data['@graph'].find((node) => node['@type'] === 'ItemList')
    expect(list?.itemListElement).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        name: 'published маяк',
        url: 'https://blog.test/p/published',
      },
    ])
    const owner_posts = await new ProfileListsRepository(database.db).listArticles(
      { ...GUEST, role: 'member', user_id: LIVE },
      LIVE,
      'fresh',
      null,
      20,
    )
    expect(owner_posts.map((post) => post.slug)).not.toContain('deleted')
  })
})
