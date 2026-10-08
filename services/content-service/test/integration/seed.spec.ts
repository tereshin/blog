import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runSeed } from '@blog/db-kit'
import { hashTables, startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { createLogger } from '@blog/logger'
import { buildDataset, seedId } from '@blog/seed-data'
import type { SeedProfileName } from '@blog/seed-data'
import type { SeedEnv } from '../../src/config/env.ts'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { seedContent } from '../../src/seed/seed.ts'

const run = promisify(execFile)
const logger = createLogger({ service: 'content-seed-test', level: 'silent' })
const ANCHOR = '2026-10-08T00:00:00Z'
const TABLES = ['users_copy', 'profiles', 'slugs', 'topics', 'articles', 'follows', 'promotions', 'settings', 'reports', 'outbox']
const env: SeedEnv = { APP_ENV: 'local', DATABASE_URL: 'unused', S3_PUBLIC_URL: 'http://localhost:9000/media' }

describe('content: seed (PostgreSQL в контейнере)', () => {
  let postgres: TestPostgres
  let database: DbHandle

  const seed = (profile: SeedProfileName, anchor_flag?: string, handle: DbHandle = database) =>
    runSeed({ handle, profile, anchor_flag, logger, write: (context) => seedContent({ ...context, profile, env, logger }) })
  const count = async (table: string, where = 'true') =>
    Number((await database.pool.query<{ n: string }>(`select count(*) as n from ${table} where ${where}`)).rows[0]?.n)

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
  }, 120_000)

  afterAll(async () => {
    await database.close()
    await postgres.stop()
  })

  it('small заполняет все таблицы владельца контента', async () => {
    await seed('small', ANCHOR)
    const expected = buildDataset('small', new Date(ANCHOR), { media_base_url: env.S3_PUBLIC_URL, superadmin_email: 'superadmin@blog.test' })
    expect(await count('users_copy')).toBe(expected.users.length)
    expect(await count('profiles')).toBe(expected.profiles.length)
    expect(await count('topics')).toBe(expected.topics.length)
    expect(await count('articles')).toBe(expected.articles.length)
    expect(await count('follows')).toBe(expected.follows.length)
    expect(await count('promotions')).toBe(2)
    expect(await count('reports')).toBe(expected.reports.length)
    expect(await count('settings')).toBe(1)
    expect(await count('outbox')).toBe(0)
  })

  it('адреса seed- в реестре: профили, темы и статьи; адрес удалённой статьи свободен', async () => {
    expect(await count('slugs', "slug not like 'seed-%'")).toBe(0)
    expect(await count('slugs', "owner_type = 'topic'")).toBe(4)
    expect(await count('slugs', "slug = 'seed-deleted'")).toBe(0)
    expect(await count('slugs', "slug = 'seed-author-a'")).toBe(1)
  })

  it('счётчики и репутация равны производным значениям тех же записей', async () => {
    const expected = buildDataset('small', new Date(ANCHOR), { media_base_url: env.S3_PUBLIC_URL, superadmin_email: 'superadmin@blog.test' })
    const long = expected.articles.find((article) => article.key === 'published_long_with_image')
    const derived = expected.derived.articles.get(long?.id ?? '')
    const { rows } = await database.pool.query<{ reaction_count: number; reaction_counts: Record<string, number>; comment_count: number; view_count: number; bookmark_count: number; top_comment: { id: string } | null }>(
      'select reaction_count, reaction_counts, comment_count, view_count, bookmark_count, top_comment from articles where id = $1',
      [long?.id],
    )
    expect(rows[0]).toMatchObject({
      reaction_count: derived?.reaction_count,
      reaction_counts: derived?.reaction_counts,
      comment_count: derived?.comment_count,
      view_count: derived?.view_count,
      bookmark_count: derived?.bookmark_count,
    })
    expect(rows[0]?.top_comment?.id).toBe(derived?.top_comment?.id)
    // Сумма по видам равна общему числу реакций для всех статей.
    expect(await count('articles', "reaction_count <> (select coalesce(sum(value::int), 0) from jsonb_each_text(reaction_counts))")).toBe(0)
    const author_b = await database.pool.query<{ reputation: number }>('select reputation from profiles where user_id = $1', [seedId('user', 'author_b')])
    expect(author_b.rows[0]?.reputation).toBe(expected.derived.reputation.get(seedId('user', 'author_b')))
    expect(author_b.rows[0]?.reputation).toBeGreaterThanOrEqual(10)
  })

  it('полнотекстовый вектор заполнен и ищет по заголовку', async () => {
    const found = await database.pool.query("select title from articles where search_vector @@ plainto_tsquery('simple', 'интерфейсы') and status = 'published'")
    expect(found.rows.map((row: { title: string }) => row.title)).toContain('Длинный текст про интерфейсы')
  })

  it('повторный запуск не меняет ни одной таблицы', async () => {
    const before = await hashTables(database.pool, [...TABLES, 'seed_runs'])
    await seed('small')
    expect(await hashTables(database.pool, [...TABLES, 'seed_runs'])).toEqual(before)
  })

  it('large добавляет 500+ публичных статей, id малого остаются, первая порция ленты быстрее двух секунд', async () => {
    await seed('large')
    expect(await count('articles', "status = 'published' and visibility = 'public'")).toBeGreaterThanOrEqual(500)
    expect(await count('articles', `id = '${seedId('article', 'published_short')}'`)).toBe(1)
    const started = performance.now()
    const { rows } = await database.pool.query("select id, title, excerpt from articles where status = 'published' and visibility = 'public' order by published_at desc, id desc limit 20")
    expect(rows).toHaveLength(20)
    expect(performance.now() - started).toBeLessThan(2000)
  })

  it('чужой адрес в реестре: запись пропускается, чужая строка не меняется', async () => {
    const other = await startPostgres()
    const foreign = openDatabase(other.url)
    try {
      await migrate(foreign.pool)
      const owner = '00000000-0000-4000-8000-000000000001'
      await foreign.pool.query("insert into slugs values ('seed-topic-design', 'profile', $1)", [owner])
      await seed('small', ANCHOR, foreign)
      const { rows } = await foreign.pool.query<{ owner_type: string; owner_id: string }>("select owner_type, owner_id from slugs where slug = 'seed-topic-design'")
      expect(rows).toEqual([{ owner_type: 'profile', owner_id: owner }])
      expect(Number((await foreign.pool.query<{ n: string }>('select count(*) as n from topics')).rows[0]?.n)).toBe(3)
      // Статьи пропущенной темы не пишутся: ссылка на тему иначе осиротела бы.
      expect(Number((await foreign.pool.query<{ n: string }>("select count(*) as n from articles where topic_id = $1", [seedId('topic', 'design')])).rows[0]?.n)).toBe(0)
    } finally {
      await foreign.close()
      await other.stop()
    }
  })

  it('в prod процесс завершается с ошибкой до записи', async () => {
    const other = await startPostgres()
    const clean = openDatabase(other.url)
    try {
      await migrate(clean.pool)
      const failure = await run('pnpm', ['exec', 'tsx', 'src/seed.ts', '--profile', 'small'], {
        cwd: new URL('../..', import.meta.url).pathname,
        env: { ...process.env, APP_ENV: 'prod', DATABASE_URL: other.url, S3_PUBLIC_URL: 'http://localhost:9000/media' },
      }).then(
        () => null,
        (error: { code: number; stderr: string }) => error,
      )
      expect(failure?.code).not.toBe(0)
      expect(failure?.stderr).toMatch(/prod/)
      expect(Number((await clean.pool.query<{ n: string }>('select count(*) as n from seed_runs')).rows[0]?.n)).toBe(0)
      expect(Number((await clean.pool.query<{ n: string }>('select count(*) as n from articles')).rows[0]?.n)).toBe(0)
    } finally {
      await clean.close()
      await other.stop()
    }
  }, 60_000)
})
