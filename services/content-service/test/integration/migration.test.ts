import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { articles, profiles, topics } from '../../src/infra/db/schema.ts'

const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const TOPIC = '5c9d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a01'

describe('content: миграция (PostgreSQL в контейнере)', () => {
  let postgres: TestPostgres
  let database: DbHandle

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
  }, 120_000)

  afterAll(async () => {
    await database.close()
    await postgres.stop()
  })

  it('создаёт все таблицы владельца контента и расширение pg_trgm', async () => {
    const tables = await database.pool.query<{ table_name: string }>("select table_name from information_schema.tables where table_schema = 'public'")
    expect(tables.rows.map((row) => row.table_name)).toEqual(
      expect.arrayContaining([
        'users_copy', 'profiles', 'slugs', 'topics', 'articles', 'follows', 'promotions', 'settings', 'reports',
        'outbox', 'processed_events', 'seed_runs', 'pages', 'nav_sections', 'nav_section_items',
      ]),
    )
    const extensions = await database.pool.query<{ extname: string }>("select extname from pg_extension where extname = 'pg_trgm'")
    expect(extensions.rowCount).toBe(1)
  })

  it('повторный запуск не применяет ничего', async () => {
    expect(await migrate(database.pool)).toEqual([])
  })

  it('есть индексы ленты, темы, автора, полнотекстовый GIN и trgm по профилям', async () => {
    const { rows } = await database.pool.query<{ indexname: string }>("select indexname from pg_indexes where schemaname = 'public'")
    expect(rows.map((row) => row.indexname)).toEqual(
      expect.arrayContaining([
        'articles_feed_idx', 'articles_topic_idx', 'articles_author_idx', 'articles_search_idx',
        'profiles_display_name_trgm_idx', 'profiles_slug_trgm_idx',
      ]),
    )
  })

  it('статья хранит блоки и находится полнотекстовым поиском; профиль — триграммами', async () => {
    await database.db.insert(topics).values({ id: TOPIC, title: 'Инженерия', slug: 'engineering' })
    await database.db.insert(profiles).values({ user_id: AUTHOR, display_name: 'Мария Иванова', slug: 'maria-ivanova' })
    await database.pool.query(
      `insert into articles (id, author_id, topic_id, title, slug, blocks, search_vector)
       values (gen_random_uuid(), $1, $2, 'Про индексы', 'pro-indeksy', '[{"type":"paragraph"}]'::jsonb,
               to_tsvector('simple', 'Про индексы в PostgreSQL'))`,
      [AUTHOR, TOPIC],
    )
    const found = await database.pool.query("select 1 from articles where search_vector @@ plainto_tsquery('simple', 'индексы')")
    expect(found.rowCount).toBe(1)
    const similar = await database.pool.query("select 1 from profiles where display_name % 'Мария Иванова'")
    expect(similar.rowCount).toBe(1)
    const rows = await database.db.select({ visibility: articles.visibility, status: articles.status, comments_enabled: articles.comments_enabled }).from(articles)
    expect(rows).toEqual([{ visibility: 'public', status: 'draft', comments_enabled: true }])
  })

  it('отклоняет неизвестный статус и пустое имя профиля', async () => {
    await expect(database.pool.query("update articles set status = 'archived'")).rejects.toThrow()
    await expect(database.pool.query("insert into profiles (user_id, display_name) values (gen_random_uuid(), '')")).rejects.toThrow()
  })

  it('пункт секции хранит svg иконку и отклоняет короткое имя', async () => {
    const section_id = '11111111-1111-4111-8111-111111111111'
    const item_id = '22222222-2222-4222-8222-222222222222'
    const icon =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/></svg>'
    await database.pool.query('insert into nav_sections (id, title, position) values ($1, $2, 0)', [
      section_id,
      'Секция',
    ])
    await database.pool.query(
      'insert into nav_section_items (id, section_id, title, icon, position) values ($1, $2, $3, $4, 0)',
      [item_id, section_id, 'Пункт', icon],
    )
    await expect(
      database.pool.query('update nav_section_items set icon = $1 where id = $2', ['link', item_id]),
    ).rejects.toThrow()
  })

  it('seed_runs принимает только профили small и large', async () => {
    await expect(database.pool.query("insert into seed_runs values ('huge', now(), now(), null)")).rejects.toThrow()
    await database.pool.query("insert into seed_runs values ('small', now(), now(), null)")
  })
})
