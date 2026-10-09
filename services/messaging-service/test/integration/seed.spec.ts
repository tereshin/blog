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
import { seedMessaging } from '../../src/seed/seed.ts'

const run = promisify(execFile)
const logger = createLogger({ service: 'messaging-seed-test', level: 'silent' })
const ANCHOR = '2026-10-08T00:00:00Z'
const env: SeedEnv = {
  APP_ENV: 'local',
  DATABASE_URL: 'unused',
  S3_PUBLIC_URL: 'http://localhost:9000/media',
  SUPERADMIN_EMAIL: 'superadmin@blog.test',
}

describe('messaging: seed (PostgreSQL в контейнере)', () => {
  let postgres: TestPostgres
  let database: DbHandle
  const expected = buildDataset('small', new Date(ANCHOR), { media_base_url: env.S3_PUBLIC_URL, superadmin_email: env.SUPERADMIN_EMAIL })

  const seed = (profile: SeedProfileName, anchor_flag?: string) =>
    runSeed({ handle: database, profile, anchor_flag, logger, write: (context) => seedMessaging({ ...context, profile, env, logger }) })
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

  it('small пишет диалоги с прочитанными и непрочитанными сообщениями и не трогает outbox', async () => {
    await seed('small', ANCHOR)
    expect(await count('conversations')).toBe(expected.conversations.length)
    expect(await count('messages')).toBe(expected.messages.length)
    expect(await count('users_copy')).toBe(expected.users.length)
    expect(await count('outbox')).toBe(0)
    const unread = await database.pool.query<{ n: string }>('select count(*) as n from messages where read_at is null')
    expect(Number(unread.rows[0]?.n)).toBe(expected.messages.filter((message) => message.read_at === null).length)
  })

  it('повтор не меняет таблицы', async () => {
    const before = await hashTables(database.pool, ['users_copy', 'conversations', 'messages', 'outbox', 'seed_runs'])
    await seed('small')
    expect(await hashTables(database.pool, ['users_copy', 'conversations', 'messages', 'outbox', 'seed_runs'])).toEqual(before)
  })

  it('в prod процесс завершается до записи', async () => {
    const other = await startPostgres()
    const clean = openDatabase(other.url)
    try {
      await migrate(clean.pool)
      const failure = await run('pnpm', ['exec', 'tsx', 'src/seed.ts', '--profile', 'small'], {
        cwd: new URL('../..', import.meta.url).pathname,
        env: { ...process.env, APP_ENV: 'prod', DATABASE_URL: other.url },
      }).then(
        () => null,
        (error: { code: number; stderr: string }) => error,
      )
      expect(failure?.code).not.toBe(0)
      expect(failure?.stderr).toMatch(/prod/)
      expect(Number((await clean.pool.query<{ n: string }>('select count(*) as n from seed_runs')).rows[0]?.n)).toBe(0)
      expect(Number((await clean.pool.query<{ n: string }>('select count(*) as n from messages')).rows[0]?.n)).toBe(0)
    } finally {
      await clean.close()
      await other.stop()
    }
  }, 60_000)
})
