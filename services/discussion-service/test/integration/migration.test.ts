import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'

const USER = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const ARTICLE = '5c9d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a01'

describe('discussion: миграция (PostgreSQL в контейнере)', () => {
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

  it('создаёт таблицы обсуждения, копии и инфраструктуру', async () => {
    const { rows } = await database.pool.query<{ table_name: string }>("select table_name from information_schema.tables where table_schema = 'public'")
    expect(rows.map((row) => row.table_name)).toEqual(
      expect.arrayContaining([
        'articles_copy', 'users_copy', 'comments', 'reactions', 'views', 'feed_seen', 'bookmarks',
        'outbox', 'processed_events', 'seed_runs',
      ]),
    )
  })

  it('повторный запуск не применяет ничего', async () => {
    expect(await migrate(database.pool)).toEqual([])
  })

  it('у участника одна реакция на цель: вторая отклоняется ключом', async () => {
    const insert = "insert into reactions (user_id, target_type, target_id, kind) values ($1, 'article', $2, $3)"
    await database.pool.query(insert, [USER, ARTICLE, 'heart'])
    await expect(database.pool.query(insert, [USER, ARTICLE, 'fire'])).rejects.toThrow(/duplicate key/)
  })

  it('просмотр и закладка считаются один раз на ключ', async () => {
    const view = 'insert into views (article_id, viewer_key) values ($1, $2) on conflict do nothing'
    expect((await database.pool.query(view, [ARTICLE, 'guest-1'])).rowCount).toBe(1)
    expect((await database.pool.query(view, [ARTICLE, 'guest-1'])).rowCount).toBe(0)
    const bookmark = 'insert into bookmarks (user_id, article_id) values ($1, $2) on conflict do nothing'
    expect((await database.pool.query(bookmark, [USER, ARTICLE])).rowCount).toBe(1)
    expect((await database.pool.query(bookmark, [USER, ARTICLE])).rowCount).toBe(0)
  })

  it('комментарий длиннее 5000 символов не сохраняется, статус по умолчанию visible', async () => {
    const insert = 'insert into comments (id, article_id, author_id, body) values (gen_random_uuid(), $1, $2, $3) returning status'
    const ok = await database.pool.query<{ status: string }>(insert, [ARTICLE, USER, 'ok'])
    expect(ok.rows[0]?.status).toBe('visible')
    await expect(database.pool.query(insert, [ARTICLE, USER, 'x'.repeat(5001)])).rejects.toThrow()
  })

  it('вид реакции ограничен четырьмя значениями', async () => {
    await expect(
      database.pool.query("insert into reactions (user_id, target_type, target_id, kind) values ($1, 'comment', $2, 'sad')", [USER, ARTICLE]),
    ).rejects.toThrow()
  })
})
