import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runSeed } from '@blog/db-kit'
import { hashTables, startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { createLogger } from '@blog/logger'
import { AnchorConflictError, seedId } from '@blog/seed-data'
import type { SeedProfileName } from '@blog/seed-data'
import type { SeedEnv } from '../../src/config/env.ts'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { seedIdentity } from '../../src/seed/seed.ts'

const run = promisify(execFile)
const logger = createLogger({ service: 'identity-seed-test', level: 'silent' })
const ANCHOR = '2026-10-08T00:00:00Z'
const TABLES = ['users', 'settings_copy', 'sessions', 'outbox']

const env: SeedEnv = { APP_ENV: 'local', DATABASE_URL: 'unused', SUPERADMIN_EMAIL: 'superadmin@blog.test', S3_PUBLIC_URL: 'http://localhost:9000/media' }

describe('identity: seed (PostgreSQL в контейнере)', () => {
  let postgres: TestPostgres
  let database: DbHandle

  const seed = (profile: SeedProfileName, anchor_flag?: string) =>
    runSeed({ handle: database, profile, anchor_flag, logger, write: (context) => seedIdentity({ ...context, profile, env, logger }) })
  const count = async (table: string) => Number((await database.pool.query<{ n: string }>(`select count(*) as n from ${table}`)).rows[0]?.n)

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
  }, 120_000)

  afterAll(async () => {
    await database.close()
    await postgres.stop()
  })

  it('small создаёт восемь участников и настройки, без сессий и outbox', async () => {
    await seed('small', ANCHOR)
    expect(await count('users')).toBe(8)
    expect(await count('settings_copy')).toBe(1)
    expect(await count('sessions')).toBe(0)
    expect(await count('outbox')).toBe(0)
    const { rows } = await database.pool.query<{ id: string; email: string; role: string }>("select id, email, role from users where role = 'superadmin'")
    expect(rows).toEqual([{ id: seedId('user', 'superadmin'), email: 'superadmin@blog.test', role: 'superadmin' }])
    const run_row = await database.pool.query<{ profile: string; finished_at: Date | null; anchor_at: Date }>('select * from seed_runs')
    expect(run_row.rows).toHaveLength(1)
    expect(run_row.rows[0]?.finished_at).not.toBeNull()
    expect(run_row.rows[0]?.anchor_at.toISOString()).toBe('2026-10-08T00:00:00.000Z')
  })

  it('повторный запуск не меняет ни одной таблицы', async () => {
    const before = await hashTables(database.pool, [...TABLES, 'seed_runs'])
    await seed('small')
    await seed('small', ANCHOR)
    expect(await hashTables(database.pool, [...TABLES, 'seed_runs'])).toEqual(before)
  })

  it('следующий новый участник получает номер после последнего seed-участника', async () => {
    const { rows } = await database.pool.query<{ public_number: number }>(
      "insert into users (id, email, email_verified) values (gen_random_uuid(), 'new@blog.test', true) returning public_number",
    )
    expect(rows[0]?.public_number).toBe(9)
    await database.pool.query("delete from users where email = 'new@blog.test'")
  })

  it('large с другим якорем после small отклоняется, без явного якоря берёт записанный', async () => {
    await expect(seed('large', '2030-01-01T00:00:00Z')).rejects.toBeInstanceOf(AnchorConflictError)
    expect(await count('users')).toBe(8)
    await seed('large')
    expect(await count('users')).toBe(8 + 72)
    const { rows } = await database.pool.query<{ profile: string }>('select profile from seed_runs order by profile')
    expect(rows.map((row) => row.profile)).toEqual(['large', 'small'])
  })

  it('id малого набора остаются теми же после large', async () => {
    const { rows } = await database.pool.query<{ n: string }>('select count(*) as n from users where id = $1', [seedId('user', 'author_a')])
    expect(rows[0]?.n).toBe('1')
  })

  it('оборванный запуск доделывается: finished_at пусто → заполняется', async () => {
    await database.pool.query("update seed_runs set finished_at = null where profile = 'small'")
    await database.pool.query("delete from users where role = 'member' and email like 'newcomer%'")
    await seed('small')
    expect(await count('users')).toBe(8 + 72)
    const { rows } = await database.pool.query<{ finished_at: Date | null }>("select finished_at from seed_runs where profile = 'small'")
    expect(rows[0]?.finished_at).not.toBeNull()
  })

  it('чужая строка с той же почтой не перезаписывается, участник пропускается', async () => {
    const other = await startPostgres()
    const foreign = openDatabase(other.url)
    try {
      await migrate(foreign.pool)
      await foreign.pool.query("insert into users (id, public_number, email, email_verified, role) values (gen_random_uuid(), 999, 'READER@blog.test', true, 'member')")
      await runSeed({ handle: foreign, profile: 'small', anchor_flag: ANCHOR, logger, write: (context) => seedIdentity({ ...context, profile: 'small', env, logger }) })
      const { rows } = await foreign.pool.query<{ email: string }>("select email from users where lower(email) = 'reader@blog.test'")
      expect(rows).toEqual([{ email: 'READER@blog.test' }])
      expect(Number((await foreign.pool.query<{ n: string }>('select count(*) as n from users')).rows[0]?.n)).toBe(8) // чужой + семь seed-участников
    } finally {
      await foreign.close()
      await other.stop()
    }
  })

  it('в prod процесс завершается с ошибкой до записи: seed_runs пуст, число строк не меняется', async () => {
    const other = await startPostgres()
    const clean = openDatabase(other.url)
    try {
      await migrate(clean.pool)
      const failure = await run('pnpm', ['exec', 'tsx', 'src/seed.ts', '--profile', 'small'], {
        cwd: new URL('../..', import.meta.url).pathname,
        env: { ...process.env, APP_ENV: 'prod', DATABASE_URL: other.url, SUPERADMIN_EMAIL: 'root@blog.test' },
      }).then(
        () => null,
        (error: { code: number; stderr: string }) => error,
      )
      expect(failure?.code).not.toBe(0)
      expect(failure?.stderr).toMatch(/prod/)
      expect(Number((await clean.pool.query<{ n: string }>('select count(*) as n from seed_runs')).rows[0]?.n)).toBe(0)
      expect(Number((await clean.pool.query<{ n: string }>('select count(*) as n from users')).rows[0]?.n)).toBe(0)
    } finally {
      await clean.close()
      await other.stop()
    }
  }, 60_000)
})
