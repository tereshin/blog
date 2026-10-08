import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runSeed } from '@blog/db-kit'
import { hashTables, startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { createLogger } from '@blog/logger'
import { buildDataset } from '@blog/seed-data'
import type { SeedProfileName } from '@blog/seed-data'
import type { SeedEnv } from '../../src/config/env.ts'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { seedDiscussion } from '../../src/seed/seed.ts'

const run = promisify(execFile)
const logger = createLogger({ service: 'discussion-seed-test', level: 'silent' })
const ANCHOR = new Date('2026-10-08T00:00:00Z')
const TABLES = ['articles_copy', 'users_copy', 'comments', 'reactions', 'views', 'feed_seen', 'bookmarks', 'outbox']
const env: SeedEnv = { APP_ENV: 'local', DATABASE_URL: 'unused', S3_PUBLIC_URL: 'http://localhost:9000/media' }
const options = { media_base_url: env.S3_PUBLIC_URL, superadmin_email: 'superadmin@blog.test' }

describe('discussion: seed (PostgreSQL в контейнере)', () => {
  let postgres: TestPostgres
  let database: DbHandle

  const seed = (profile: SeedProfileName, anchor_flag?: string) =>
    runSeed({ handle: database, profile, anchor_flag, logger, write: (context) => seedDiscussion({ ...context, profile, env, logger }) })
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

  it('small заполняет все таблицы обсуждения теми же идентификаторами, что у content', async () => {
    await seed('small', ANCHOR.toISOString())
    const expected = buildDataset('small', ANCHOR, options)
    expect(await count('articles_copy')).toBe(expected.articles.length)
    expect(await count('users_copy')).toBe(expected.users.length)
    expect(await count('comments')).toBe(expected.comments.length)
    expect(await count('reactions')).toBe(expected.reactions.length)
    expect(await count('views')).toBe(expected.views.length)
    expect(await count('feed_seen')).toBe(expected.feed_seen.length)
    expect(await count('bookmarks')).toBe(expected.bookmarks.length)
    expect(await count('outbox')).toBe(0)
  })

  it('счётчики комментариев равны пересчёту по строкам реакций и ответов', async () => {
    expect(await count('comments c', 'c.reaction_count <> (select count(*) from reactions r where r.target_type = \'comment\' and r.target_id = c.id)')).toBe(0)
    expect(
      await count('comments c', "c.reply_count <> (select count(*) from comments r where r.parent_id = c.id and r.status = 'visible')"),
    ).toBe(0)
  })

  it('производные значения статей из seed совпадают с пересчётом по таблицам discussion', async () => {
    const expected = buildDataset('small', ANCHOR, options)
    for (const [article_id, derived] of expected.derived.articles) {
      const { rows } = await database.pool.query<{ reactions: string; views: string; bookmarks: string; comments: string }>(
        `select
           (select count(*) from reactions where target_type = 'article' and target_id = $1) as reactions,
           (select count(*) from views where article_id = $1) as views,
           (select count(*) from bookmarks where article_id = $1) as bookmarks,
           (select count(*) from comments c where c.article_id = $1 and (c.status = 'visible'
              or exists (select 1 from comments r where r.parent_id = c.id and r.status = 'visible'))) as comments`,
        [article_id],
      )
      expect(
        { reactions: Number(rows[0]?.reactions), views: Number(rows[0]?.views), bookmarks: Number(rows[0]?.bookmarks), comments: Number(rows[0]?.comments) },
        article_id,
      ).toEqual({ reactions: derived.reaction_count, views: derived.view_count, bookmarks: derived.bookmark_count, comments: derived.comment_count })
    }
  })

  it('репутация из seed равна числу реакций на опубликованные статьи и видимые комментарии автора', async () => {
    const expected = buildDataset('small', ANCHOR, options)
    for (const [user_id, reputation] of expected.derived.reputation) {
      const { rows } = await database.pool.query<{ n: string }>(
        `select
           (select count(*) from reactions r join articles_copy a on r.target_type = 'article' and r.target_id = a.article_id
             where a.author_id = $1 and a.status = 'published')
         + (select count(*) from reactions r join comments c on r.target_type = 'comment' and r.target_id = c.id
             where c.author_id = $1 and c.status = 'visible') as n`,
        [user_id],
      )
      expect(Number(rows[0]?.n), user_id).toBe(reputation)
    }
  })

  it('у участника одна реакция на объект: ключ таблицы это гарантирует', async () => {
    expect(await count('(select user_id, target_type, target_id from reactions group by 1, 2, 3 having count(*) > 1) d')).toBe(0)
  })

  it('повторный запуск не меняет ни одной таблицы', async () => {
    const before = await hashTables(database.pool, [...TABLES, 'seed_runs'])
    await seed('small')
    expect(await hashTables(database.pool, [...TABLES, 'seed_runs'])).toEqual(before)
  })

  it('large добавляет 3000+ комментариев и не меняет строки малого набора', async () => {
    const small_ids = buildDataset('small', ANCHOR, options).comments.map((comment) => `'${comment.id}'`).join(',')
    const hash_small = async () =>
      (await database.pool.query<{ hash: string }>(`select md5(string_agg(c::text, '|' order by c::text)) as hash from comments c where id in (${small_ids})`)).rows[0]?.hash
    const before = await hash_small()
    await seed('large')
    expect(await hash_small()).toBe(before)
    expect(await count('comments')).toBeGreaterThanOrEqual(3000)
    expect(await count('comments c', "c.reaction_count <> (select count(*) from reactions r where r.target_type = 'comment' and r.target_id = c.id)")).toBe(0)
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
    } finally {
      await clean.close()
      await other.stop()
    }
  }, 60_000)
})
