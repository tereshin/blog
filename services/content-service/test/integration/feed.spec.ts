import { eq } from 'drizzle-orm'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { feedPageSchema, topicListSchema } from '@blog/contracts'
import type { FeedPage, ServiceContext } from '@blog/contracts'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { errorHandler, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { articles, profiles, promotions, settings, topics, users_copy } from '../../src/infra/db/schema.ts'
import { accessRoutes } from '../../src/modules/access/index.ts'
import { feedRoutes } from '../../src/modules/feed/index.ts'
import { settingsRoutes } from '../../src/modules/settings/index.ts'
import { topicRoutes } from '../../src/modules/topic/index.ts'

const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const OTHER = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99'
const TOPIC = '5c9d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a01'
const ARCHIVED_TOPIC = '5c9d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a02'
const COMMENTER = '7b1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a33'
const DAY = 24 * 60 * 60 * 1000

const viewers: Record<string, ServiceContext> = {
  guest: { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' },
  member: { user_id: OTHER, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${OTHER}` },
  author: { user_id: AUTHOR, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${AUTHOR}` },
}

function id(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`
}

describe('content: лента, темы и настройки на PostgreSQL', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance
  const now = Date.now()

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    const { db } = database

    await db.insert(topics).values([
      { id: TOPIC, title: 'Технологии', slug: 'tech', position: 2 },
      { id: ARCHIVED_TOPIC, title: 'Старое', slug: 'old', status: 'archived', position: 1 },
    ])
    await db.insert(users_copy).values({ user_id: AUTHOR, public_number: 7, created_at: new Date(now - 100 * DAY) })
    await db.insert(profiles).values([
      { user_id: AUTHOR, display_name: 'Анна', slug: 'anna' },
      { user_id: COMMENTER, display_name: 'Борис', avatar_url: 'http://x/b.png' },
    ])

    const base = { author_id: AUTHOR, topic_id: TOPIC, status: 'published' as const, visibility: 'public' as const }
    // 25 публичных статей с шагом в минуту: нужны две порции.
    for (let index = 1; index <= 25; index += 1) {
      await db.insert(articles).values({
        ...base,
        id: id(index),
        title: `Статья ${index}`,
        slug: `a-${index}`,
        published_at: new Date(now - index * 60_000),
        reaction_count: index % 5,
        comment_count: index % 3,
      })
    }
    await db.insert(articles).values([
      { ...base, id: id(101), title: 'Для участников', slug: 'members', visibility: 'members', published_at: new Date(now - 10_000) },
      { ...base, id: id(102), title: 'Только автор', slug: 'author-only', visibility: 'author', published_at: new Date(now - 10_000) },
      { ...base, id: id(103), title: 'Черновик', slug: 'draft', status: 'draft', published_at: null },
      { ...base, id: id(104), title: 'Скрытая', slug: 'hidden', status: 'hidden', published_at: new Date(now - 10_000) },
      { ...base, id: id(105), title: 'Удалённая', slug: 'deleted', status: 'deleted', published_at: new Date(now - 10_000) },
      // Старая, но с действующим продвижением, и старая без него.
      { ...base, id: id(106), title: 'Старая продвигаемая', slug: 'old-promoted', published_at: new Date(now - 30 * DAY), reaction_count: 0 },
      { ...base, id: id(107), title: 'Старая', slug: 'old-plain', published_at: new Date(now - 30 * DAY), reaction_count: 99 },
      {
        ...base,
        id: id(108),
        topic_id: ARCHIVED_TOPIC,
        title: 'В архивной теме',
        slug: 'in-archived',
        published_at: new Date(now - 5_000),
        top_comment: { id: id(900), author_id: COMMENTER, body: 'Хороший разбор', reaction_count: 3, reply_count: 0 },
      },
    ])
    await db.insert(promotions).values({ article_id: id(106), confirmed_at: new Date(now - DAY), until: new Date(now + DAY) })

    app = Fastify()
    await app.register(requestContext, { logger: createLogger({ service: 'content-test', level: 'silent' }) })
    await app.register(errorHandler)
    app.decorateRequest('viewer', undefined as unknown as ServiceContext)
    app.addHook('onRequest', async (request) => {
      request.viewer = viewers[String(request.headers['x-test-viewer'])] ?? (viewers['guest'] as ServiceContext)
    })
    await app.register(accessRoutes, { database })
    await app.register(topicRoutes, { database, media_url: 'http://media.test' })
    await app.register(settingsRoutes, { database, media_url: 'http://media.test' })
    await app.register(feedRoutes, { database })
  }, 120_000)

  afterAll(async () => {
    await app.close()
    await database.close()
    await postgres.stop()
  })

  async function feed(query: string, viewer = 'guest'): Promise<FeedPage> {
    const response = await app.inject({ method: 'GET', url: `/v1/feed?${query}`, headers: { 'x-test-viewer': viewer } })
    expect(response.statusCode).toBe(200)
    return feedPageSchema.parse(response.json())
  }

  it('гость видит только опубликованное публичное, от новых к старым', async () => {
    const page = await feed('mode=fresh')
    const titles = page.items.map((item) => item.title)
    expect(titles).not.toContain('Для участников')
    expect(titles).not.toContain('Только автор')
    expect(titles).not.toContain('Черновик')
    expect(titles).not.toContain('Скрытая')
    expect(titles).not.toContain('Удалённая')
    expect(titles[0]).toBe('В архивной теме')
    const times = page.items.map((item) => Date.parse(item.published_at))
    expect(times).toEqual([...times].sort((a, b) => b - a))
  })

  it('участник дополнительно видит статьи «для участников», автор — свои закрытые', async () => {
    expect((await feed('mode=fresh', 'member')).items.map((item) => item.title)).toContain('Для участников')
    const member_titles = (await feed('mode=fresh', 'member')).items.map((item) => item.title)
    expect(member_titles).not.toContain('Только автор')
    const author_titles = (await feed('mode=fresh', 'author')).items.map((item) => item.title)
    expect(author_titles).toContain('Только автор')
    expect(author_titles).not.toContain('Черновик')
  })

  it('курсор не дублирует и не теряет карточки, даже когда вышла новая публикация', async () => {
    const first = await feed('mode=fresh&limit=10')
    expect(first.items).toHaveLength(10)
    expect(first.next_cursor).not.toBeNull()

    await database.db.insert(articles).values({
      id: id(200),
      author_id: AUTHOR,
      topic_id: TOPIC,
      title: 'Свежая во время чтения',
      slug: 'fresh-now',
      status: 'published',
      published_at: new Date(now + 60_000),
    })

    const seen = new Set(first.items.map((item) => item.id))
    let cursor = first.next_cursor
    while (cursor) {
      const page = await feed(`mode=fresh&limit=10&cursor=${cursor}`)
      for (const item of page.items) {
        expect(seen.has(item.id)).toBe(false)
        seen.add(item.id)
      }
      cursor = page.next_cursor
    }
    // Все 26 видимых гостю статей, существовавших на момент первой порции, прочитаны ровно по разу.
    const expected = 25 + 3 // 25 серийных + «Старая продвигаемая» + «Старая» + «В архивной теме»
    expect(seen.size).toBe(expected)
    expect(seen.has(id(200))).toBe(false)
    await database.db.delete(articles).where(eq(articles.id, id(200)))
  })

  it('«Популярное»: недавние и продвигаемые, по счёту, курсор устойчив', async () => {
    const first = await feed('mode=popular&limit=10')
    const scores = first.items.map((item) => item.reaction_count + item.comment_count)
    expect(scores).toEqual([...scores].sort((a, b) => b - a))

    const seen = new Set(first.items.map((item) => item.id))
    let cursor = first.next_cursor
    while (cursor) {
      const page = await feed(`mode=popular&limit=10&cursor=${cursor}`)
      for (const item of page.items) {
        expect(seen.has(item.id)).toBe(false)
        seen.add(item.id)
      }
      cursor = page.next_cursor
    }
    expect(seen.size).toBe(25 + 2) // 25 серийных, «Старая продвигаемая», «В архивной теме»
    expect(seen.has(id(106))).toBe(true)
    expect(seen.has(id(107))).toBe(false)
  })

  it('режим темы ограничен темой; архивная тема отдаёт свои статьи', async () => {
    const tech = await feed('mode=topic:tech&limit=20')
    expect(tech.items.every((item) => item.topic.slug === 'tech')).toBe(true)
    const archived = await feed('mode=topic:old')
    expect(archived.items.map((item) => item.title)).toEqual(['В архивной теме'])
    expect(archived.items[0]?.topic.status).toBe('archived')
  })

  it('карточка собрана из профиля, темы и самого обсуждаемого комментария', async () => {
    const card = (await feed('mode=topic:old')).items[0]
    expect(card?.author).toMatchObject({ user_id: AUTHOR, display_name: 'Анна', slug: 'anna' })
    expect(card?.top_comment).toMatchObject({ author_name: 'Борис', excerpt: 'Хороший разбор' })
  })

  it('«Моя лента» отвечает 501, мусорный курсор — 422', async () => {
    expect((await app.inject({ method: 'GET', url: '/v1/feed?mode=mine' })).statusCode).toBe(501)
    expect((await app.inject({ method: 'GET', url: '/v1/feed?mode=fresh&cursor=junk' })).statusCode).toBe(422)
  })

  it('темы: активные по порядку; архивная открывается по адресу, неизвестной нет', async () => {
    const list = topicListSchema.parse((await app.inject({ method: 'GET', url: '/v1/topics' })).json())
    expect(list.map((topic) => topic.slug)).toEqual(['tech'])
    expect((await app.inject({ method: 'GET', url: '/v1/topics/old' })).json()).toMatchObject({ slug: 'old', status: 'archived' })
    expect((await app.inject({ method: 'GET', url: '/v1/topics/nope' })).statusCode).toBe(404)
  })

  it('настройки: значения по умолчанию, затем заданные', async () => {
    expect((await app.inject({ method: 'GET', url: '/v1/settings' })).json()).toEqual({ name: 'Блог', logo_url: null, locale: 'ru', about: '' })
    await database.db.insert(settings).values({ id: 1, name: 'Мой блог', locale: 'sr', about: 'О нас' })
    expect((await app.inject({ method: 'GET', url: '/v1/settings' })).json()).toEqual({ name: 'Мой блог', logo_url: null, locale: 'sr', about: 'О нас' })
  })
})
