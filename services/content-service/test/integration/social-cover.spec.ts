import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { processEvent } from '@blog/broker'
import { SocialCoverGeneratedV1, SocialCoverRequestedV1, DEFAULT_SOCIAL_COVER_SETTINGS } from '@blog/contracts'
import type { SocialImages } from '@blog/contracts'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { articles, topics, profiles, settings } from '../../src/infra/db/schema.ts'
import { requestArticleCover, requestAuthorCovers, requestSiteCover, applyGeneratedCover } from '../../src/modules/social-cover/index.ts'
import { SeoService, SeoRepository, CrawlService } from '../../src/modules/seo/index.ts'
const AUTHOR = randomUUID(), TOPIC = randomUUID(), ARTICLE = randomUUID(), LEGACY = randomUUID()
const image = { url: 'https://cdn.example/social.jpg', width: 1200, height: 630, alt: 'Статья', mime: 'image/jpeg' }
const images: SocialImages = { og: image, twitter: image, vk: { ...image, width: 1074, height: 480 } }
describe('content: версии превью и индексация (PostgreSQL)', () => {
  let postgres: TestPostgres, database: DbHandle
  const events = async () => (await database.pool.query<{ payload: unknown }>("select payload from outbox where name='content.social_cover.requested' order by created_at,id")).rows.map((row) => SocialCoverRequestedV1.parse(row.payload))
  const request = () => database.db.transaction(async (tx) => requestArticleCover(tx, ARTICLE, randomUUID()))
  const generated = (event: SocialCoverRequestedV1) => SocialCoverGeneratedV1.parse({ event_id: randomUUID(), name: 'media.social_cover.generated', version: 1, occurred_at: new Date().toISOString(), correlation_id: event.correlation_id, causation_id: event.event_id, target_id: event.target_id, revision: event.revision, images })
  const covers = () => new SeoRepository(database.db).covers(ARTICLE)
  beforeAll(async () => {
    postgres = await startPostgres(); database = openDatabase(postgres.url); await migrate(database.pool)
    await database.db.insert(topics).values({ id: TOPIC, title: 'Тема', slug: 'topic', position: 0 })
    await database.db.insert(profiles).values({ user_id: AUTHOR, display_name: 'Автор' })
    await database.db.insert(articles).values([ARTICLE, LEGACY].map((id) => ({ id, author_id: AUTHOR, topic_id: TOPIC, title: 'Статья', slug: id === ARTICLE ? 'article' : 'legacy', status: 'published' as const, visibility: 'public' as const, published_at: new Date(), blocks: { time: 1, version: '2.28.0', blocks: [] } })))
  }, 120_000)
  afterAll(async () => { await database?.close(); await postgres?.stop() })
  it('не создаёт массово превью, повторный запрос одной версии не создаёт событие', async () => {
    expect(await events()).toHaveLength(0)
    await request(); await request()
    expect(await events()).toHaveLength(1)
    expect(await new SeoRepository(database.db).covers(LEGACY)).toBeNull()
  })
  it('принимает актуальную версию один раз, устаревшая версия не меняет результат', async () => {
    const first = (await events())[0]; expect(first).toBeDefined(); if (!first) return
    await database.db.update(articles).set({ title: 'Новый заголовок' }).where(eq(articles.id, ARTICLE)); await request()
    expect(await covers()).toBeNull()
    await processEvent(database.db, 'test-covers', generated(first), applyGeneratedCover)
    expect(await covers()).toBeNull()
    const last = (await events()).at(-1); if (!last) throw new Error('Missing event')
    const event = generated(last)
    expect(await processEvent(database.db, 'test-covers', event, applyGeneratedCover)).toBe('ok')
    expect(await processEvent(database.db, 'test-covers', event, applyGeneratedCover)).toBe('duplicate')
    expect(await covers()).toEqual(images)
  })
  it('переименование обновляет только уже запрошенные публичные карточки', async () => {
    const before = (await events()).length
    await database.db.transaction(async (tx) => { await tx.update(profiles).set({ display_name: 'Новый автор' }).where(eq(profiles.user_id, AUTHOR)); await requestAuthorCovers(tx, AUTHOR, randomUUID()) })
    expect(await events()).toHaveLength(before + 1)
    expect((await events()).at(-1)?.input.author_name).toBe('Новый автор')
    expect((await events()).some((event) => event.target_id === LEGACY)).toBe(false)
  })
  it('скрытие удаляет ссылку и отбрасывает запоздавший результат; восстановление запрашивает заново', async () => {
    const last = (await events()).at(-1); if (!last) throw new Error('Missing event')
    await database.db.update(articles).set({ visibility: 'members' }).where(eq(articles.id, ARTICLE)); await request()
    await processEvent(database.db, 'test-covers', generated(last), applyGeneratedCover)
    expect(await covers()).toBeNull()
    const page = await new SeoService(new SeoRepository(database.db), { public_origin: 'https://blog.example', app_env: 'prod' }).page('/p/article')
    expect(page.body_text).toBe(''); expect(JSON.stringify(page)).not.toContain('Новый заголовок')
    const before = (await events()).length
    await database.db.update(articles).set({ visibility: 'public' }).where(eq(articles.id, ARTICLE)); await request()
    expect(await events()).toHaveLength(before + 1)
  })
  it('новое оформление меняет общую карточку без пересоздания старых статей', async () => {
    await database.db.insert(settings).values({ id: 1, name: 'Сайт', social_cover: { ...DEFAULT_SOCIAL_COVER_SETTINGS, background_mode: 'color', background_color: '#445566' } })
    const before = (await events()).filter((event) => event.target_id !== 'site').length
    await database.db.transaction(async (tx) => requestSiteCover(tx, randomUUID()))
    expect((await events()).filter((event) => event.target_id !== 'site')).toHaveLength(before)
    expect((await events()).at(-1)?.target_id).toBe('site')
  })
  it('sitemap содержит только публичные canonical, реальные даты; local закрыт', async () => {
    await database.db.update(articles).set({ status: 'hidden' }).where(eq(articles.id, LEGACY))
    const repository = new SeoRepository(database.db)
    const crawl = new CrawlService(database.db, repository, { public_origin: 'https://blog.example', app_env: 'prod' })
    expect((await crawl.sitemap())?.body).toContain('/sitemaps/articles-start.xml')
    const static_part = (await crawl.sitemap('static'))?.body
    expect(static_part).toContain('https://blog.example/discovery')
    expect(static_part).toContain('https://blog.example/discovery/blogs')
    expect(static_part).toContain('https://blog.example/discovery/topics')
    expect(static_part).not.toContain('/rating')
    const part = (await crawl.sitemap('articles-start'))?.body
    expect(part).toContain('https://blog.example/p/article'); expect(part).toContain('<lastmod>'); expect(part).not.toContain('legacy')
    expect(await crawl.sitemap('articles-INVALID')).toBeNull()
    const local = new CrawlService(database.db, repository, { public_origin: 'http://localhost', app_env: 'local' })
    expect((await local.robots()).body).toBe('User-agent: *\nDisallow: /\n')
    expect((await local.sitemap())?.body).not.toContain('<loc>')
  })
  it('следующая правка повторно запрашивает давно неготовую карточку той же версии', async () => {
    await request()
    const before = (await events()).length
    const revision = (await events()).at(-1)?.revision
    await database.pool.query("update social_covers set requested_at=now()-interval '3 minutes', images=null where target_id=$1", [ARTICLE])
    await request()
    expect(await events()).toHaveLength(before + 1)
    expect((await events()).at(-1)?.revision).toBe(revision)
    await request()
    expect(await events()).toHaveLength(before + 1)
  })

})
