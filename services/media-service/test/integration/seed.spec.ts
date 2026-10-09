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
import type { SeedObjectStore } from '../../src/seed/object-store.ts'
import { seedMedia } from '../../src/seed/seed.ts'

const run = promisify(execFile)
const logger = createLogger({ service: 'media-seed-test', level: 'silent' })
const ANCHOR = '2026-10-08T00:00:00Z'
const env: SeedEnv = {
  APP_ENV: 'local',
  DATABASE_URL: 'unused',
  S3_ENDPOINT: 'http://127.0.0.1:9000',
  S3_BUCKET: 'media',
  S3_ACCESS_KEY: 'key',
  S3_SECRET_KEY: 'secret',
  S3_PUBLIC_URL: 'http://localhost:9000/media',
  S3_REGION: 'us-east-1',
  SUPERADMIN_EMAIL: 'superadmin@blog.test',
}

function memoryStore(): SeedObjectStore & { puts: string[] } {
  const objects = new Map<string, Uint8Array>()
  const puts: string[] = []
  return {
    puts,
    async exists(key) {
      return objects.has(key)
    },
    async put({ key, body }) {
      puts.push(key)
      objects.set(key, body)
    },
  }
}

describe('media: seed (PostgreSQL в контейнере)', () => {
  let postgres: TestPostgres
  let database: DbHandle
  const store = memoryStore()
  const expected = buildDataset('small', new Date(ANCHOR), { media_base_url: env.S3_PUBLIC_URL, superadmin_email: env.SUPERADMIN_EMAIL })

  const seed = (profile: SeedProfileName, anchor_flag?: string) =>
    runSeed({
      handle: database,
      profile,
      anchor_flag,
      logger,
      write: (context) => seedMedia({ ...context, profile, env, logger, store }),
    })

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
  }, 120_000)

  afterAll(async () => {
    await database.close()
    await postgres.stop()
  })

  it('кладёт каждый объект один раз и пишет files с теми же URL', async () => {
    await seed('small', ANCHOR)
    expect(store.puts).toHaveLength(expected.files.length)
    const { rows } = await database.pool.query<{ url: string }>('select url from files order by url')
    expect(rows.map((row) => row.url).sort()).toEqual(expected.files.map((file) => file.url).sort())
    expect(Number((await database.pool.query<{ n: string }>('select count(*) as n from files')).rows[0]?.n)).toBe(expected.files.length)
  })

  it('повтор не создаёт объектов и строк', async () => {
    const before = await hashTables(database.pool, ['files', 'seed_runs'])
    const puts_before = store.puts.length
    await seed('small')
    expect(store.puts).toHaveLength(puts_before)
    expect(await hashTables(database.pool, ['files', 'seed_runs'])).toEqual(before)
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
      expect(Number((await clean.pool.query<{ n: string }>('select count(*) as n from files')).rows[0]?.n)).toBe(0)
    } finally {
      await clean.close()
      await other.stop()
    }
  }, 60_000)
})
