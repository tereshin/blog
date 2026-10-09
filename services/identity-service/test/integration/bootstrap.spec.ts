import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { auth_identities, outbox, users } from '../../src/infra/db/schema.ts'
import { createAuthRepository } from '../../src/modules/auth/index.ts'

const run = promisify(execFile)
const SUPERADMIN_EMAIL = 'superadmin@blog.test'

describe('identity: bootstrap', () => {
  let postgres: TestPostgres
  let database: DbHandle

  const provision = () => createAuthRepository(database.db).provisionSuperadmin({ email: SUPERADMIN_EMAIL, correlation_id: 'bootstrap' })

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
  }, 120_000)

  afterAll(async () => {
    await database.close()
    await postgres.stop()
  })

  it('два запуска создают одну строку и одно событие, без тестовых людей и без сессии', async () => {
    const first = await provision()
    const second = await provision()
    expect(first.created).toBe(true)
    expect(second.created).toBe(false)
    expect(second.user_id).toBe(first.user_id)
    const rows = await database.db.select().from(users)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ email: SUPERADMIN_EMAIL, role: 'superadmin', can_publish: true })
    expect(await database.db.select().from(auth_identities)).toHaveLength(0)
    const events = await database.db.select().from(outbox)
    expect(events).toHaveLength(1)
    expect(events[0]?.name).toBe('identity.user.created')
    expect(Number((await database.pool.query<{ n: string }>('select count(*) as n from sessions')).rows[0]?.n)).toBe(0)
  })

  it('без SUPERADMIN_EMAIL процесс завершается до записи', async () => {
    const other = await startPostgres()
    const clean = openDatabase(other.url)
    try {
      await migrate(clean.pool)
      const env: NodeJS.ProcessEnv = { ...process.env, APP_ENV: 'prod', DATABASE_URL: other.url }
      delete env['SUPERADMIN_EMAIL']
      const failure = await run('pnpm', ['exec', 'tsx', 'src/bootstrap.ts'], {
        cwd: new URL('../..', import.meta.url).pathname,
        env,
      }).then(
        () => null,
        (error: { code: number; stderr: string }) => error,
      )
      expect(failure?.code).not.toBe(0)
      expect(failure?.stderr).toMatch(/SUPERADMIN_EMAIL/)
      expect(Number((await clean.pool.query<{ n: string }>('select count(*) as n from users')).rows[0]?.n)).toBe(0)
    } finally {
      await clean.close()
      await other.stop()
    }
  }, 60_000)
})
