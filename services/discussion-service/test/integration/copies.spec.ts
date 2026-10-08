import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { newEventId, processEvent } from '@blog/broker'
import type { OutboxEvent } from '@blog/broker'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { articles_copy, users_copy } from '../../src/infra/db/schema.ts'
import { createCopiesHandler } from '../../src/modules/copies/index.ts'

const USER = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const ARTICLE = '5c9d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a01'
const CONSUMER = 'test-copies'

function event(name: string, payload: Record<string, unknown>): OutboxEvent {
  return {
    event_id: newEventId(),
    name,
    occurred_at: '2026-10-08T10:00:00.000Z',
    correlation_id: 'test',
    causation_id: null,
    version: 1,
    ...payload,
  }
}

const user = { user_id: USER, public_number: 7, role: 'member', can_publish: true, is_restricted: false, created_at: '2026-01-01T00:00:00.000Z' }
const article = {
  article_id: ARTICLE,
  author_id: USER,
  topic_id: '5f0f6a52-0d8b-4f6e-a8b1-000000000001',
  title: 'Заголовок',
  slug: 'zagolovok',
  visibility: 'public',
  status: 'published',
  comments_enabled: true,
  excerpt: 'Коротко',
  first_image_url: null,
  published_at: '2026-10-01T00:00:00.000Z',
}

describe('discussion: копии из событий (PostgreSQL в контейнере)', () => {
  let postgres: TestPostgres
  let database: DbHandle
  const handler = createCopiesHandler()
  const apply = (e: OutboxEvent) => processEvent(database.db, CONSUMER, e, handler)
  const readUser = async () => (await database.db.select().from(users_copy).where(eq(users_copy.user_id, USER)))[0]
  const readArticle = async () => (await database.db.select().from(articles_copy).where(eq(articles_copy.article_id, ARTICLE)))[0]

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
  }, 120_000)

  afterAll(async () => {
    await database.close()
    await postgres.stop()
  })

  it('identity.user.created создаёт копию участника с именем', async () => {
    await apply(event('identity.user.created', { ...user, display_name: 'Мария' }))
    expect(await readUser()).toEqual({ user_id: USER, display_name: 'Мария', avatar_url: null, is_restricted: false })
  })

  it('событие дважды — эффект один', async () => {
    const restricted = event('identity.user.restricted', { ...user, is_restricted: true })
    expect(await apply(restricted)).toBe('ok')
    expect(await apply(restricted)).toBe('duplicate')
    expect((await readUser())?.is_restricted).toBe(true)
    // Старая копия не «откатывается» повторной доставкой устаревшего события.
    await apply(event('identity.user.updated', { ...user, is_restricted: false }))
    expect(await apply(restricted)).toBe('duplicate')
    expect((await readUser())?.is_restricted).toBe(false)
  })

  it('content.profile.updated меняет имя и аватар, ограничение не трогает', async () => {
    await apply(event('identity.user.restricted', { ...user, is_restricted: true }))
    await apply(event('content.profile.updated', { user_id: USER, display_name: 'Мария Иванова', avatar_url: 'http://media/a.png', slug: 'maria' }))
    expect(await readUser()).toEqual({ user_id: USER, display_name: 'Мария Иванова', avatar_url: 'http://media/a.png', is_restricted: true })
  })

  it('профиль раньше участника не теряется: копия создаётся, ограничение по умолчанию снято', async () => {
    const early = '8b1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a11'
    await apply(event('content.profile.updated', { user_id: early, display_name: 'Ранний', avatar_url: null, slug: null }))
    const [row] = await database.db.select().from(users_copy).where(eq(users_copy.user_id, early))
    expect(row).toMatchObject({ display_name: 'Ранний', is_restricted: false })
  })

  it('статья: published → updated → hidden → deleted обновляет одну строку', async () => {
    await apply(event('content.article.published', article))
    expect(await readArticle()).toMatchObject({ status: 'published', visibility: 'public', comments_enabled: true, title: 'Заголовок' })

    await apply(event('content.article.updated', { ...article, title: 'Новый', slug: 'novyi', visibility: 'members', comments_enabled: false }))
    expect(await readArticle()).toMatchObject({ title: 'Новый', slug: 'novyi', visibility: 'members', comments_enabled: false })

    await apply(event('content.article.hidden', { ...article, status: 'hidden' }))
    expect((await readArticle())?.status).toBe('hidden')

    await apply(event('content.article.deleted', { ...article, status: 'deleted' }))
    expect((await readArticle())?.status).toBe('deleted')
    expect(await database.db.select().from(articles_copy)).toHaveLength(1)
  })

  it('неизвестное событие пропускается, невалидное — ошибка (уйдёт в повтор и DLQ)', async () => {
    await expect(apply(event('content.article.restored', article))).resolves.toBe('ok')
    await expect(apply(event('content.article.published', { article_id: ARTICLE }))).rejects.toThrow()
  })
})
