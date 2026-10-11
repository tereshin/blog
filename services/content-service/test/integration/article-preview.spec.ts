import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { articles, topics } from '../../src/infra/db/schema.ts'
import { createFeedService } from '../../src/modules/feed/feed.service.ts'
import { createFeedRepository } from '../../src/modules/feed/feed.repository.ts'
import { createArticleRepository } from '../../src/modules/article/article.repository.ts'
import { createProfileLists } from '../../src/modules/profile/profile.lists.ts'

const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const ARTICLE = '7a1c2d30-1111-4a11-8a11-000000000010'
const TOPIC = '5c9d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a01'
const guest = { role: 'guest' as const, is_restricted: false, can_publish: false, viewer_key: 'guest:preview' }
const paragraph = (text: string) => ({ type: 'paragraph', data: { text } })
const image = (url: string, caption = '') => ({ type: 'image', data: { file: { url }, caption } })
const IMAGE = 'https://example.com/one.png'

const CASES = [
  { name: 'короткий параграф', blocks: [paragraph('Короткая заметка.')], excerpt: 'Короткая заметка.', has_more: false },
  { name: 'пробелы и встроенная разметка', blocks: [paragraph('Короткая <b>заметка</b>.\n  Ещё строка.')], excerpt: 'Короткая заметка . Ещё строка.', has_more: false },
  { name: 'длинный параграф', blocks: [paragraph('Длинный текст '.repeat(40))], excerpt: 'Длинный текст…', has_more: true },
  { name: 'несколько параграфов', blocks: [paragraph('Начало.'), paragraph('Продолжение.')], excerpt: 'Начало. Продолжение.', has_more: true },
  { name: 'параграф и одно изображение', blocks: [paragraph('Заметка.'), image(IMAGE)], excerpt: 'Заметка.', has_more: false },
  { name: 'изображение с подписью', blocks: [image(IMAGE, 'Подпись')], excerpt: '', has_more: true },
  { name: 'два изображения', blocks: [image(IMAGE), image('https://example.com/two.png')], excerpt: '', has_more: true },
  { name: 'одно изображение', blocks: [image(IMAGE)], excerpt: '', has_more: false },
  { name: 'цитата', blocks: [{ type: 'quote', data: { text: 'Цитата.' } }], excerpt: 'Цитата.', has_more: true },
  { name: 'список', blocks: [{ type: 'list', data: { items: ['Пункт.'] } }], excerpt: '', has_more: true },
]

describe('скрытое содержимое карточек (PostgreSQL)', () => {
  let postgres: TestPostgres
  let database: DbHandle

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    await database.db.insert(topics).values({ id: TOPIC, title: 'Тема', slug: 'preview', position: 1 })
    await database.db.insert(articles).values({ id: ARTICLE, author_id: AUTHOR, topic_id: TOPIC, title: 'Статья', slug: 'preview-article', status: 'published', published_at: new Date() })
  }, 120_000)

  afterAll(async () => { await database?.close(); await postgres?.stop() })

  it.each(CASES)('$name', async ({ blocks, excerpt, has_more }) => {
    const has_image = blocks.some((block) => block.type === 'image')
    await database.db.update(articles).set({ blocks: { blocks }, excerpt, first_image_url: has_image ? IMAGE : null }).where(eq(articles.id, ARTICLE))
    const feed = await createFeedService(createFeedRepository(database.db)).getPage(guest, { mode: 'fresh', limit: 20 })
    expect(feed.items[0]?.has_more_content).toBe(has_more)
    const profile = await createProfileLists(database.db).listArticles(guest, AUTHOR, 'fresh', null, 20)
    expect(profile[0]?.has_more_content).toBe(has_more)
    const cards = await createArticleRepository(database.db).findVisibleByIds(guest, [ARTICLE])
    expect(cards[0]?.has_more_content).toBe(has_more)
  })
})
