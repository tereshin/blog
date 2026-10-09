import { execFile } from 'node:child_process'
import { createServer } from 'node:net'
import type { AddressInfo } from 'node:net'
import { promisify } from 'node:util'
import Fastify from 'fastify'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { errorHandler, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { buildApp as buildMockGoogle } from '../../../../infra/mock-google/src/app.ts'
import { loadEnv as loadMockEnv } from '../../../../infra/mock-google/src/config/env.ts'
import type { Env } from '../../src/config/env.ts'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { outbox, users } from '../../src/infra/db/schema.ts'
import { authRoutes, createAuthRepository, createAuthService } from '../../src/modules/auth/index.ts'

const run = promisify(execFile)
const logger = createLogger({ service: 'identity-bootstrap-test', level: 'silent' })
const SUPERADMIN_EMAIL = 'superadmin@blog.test'
const CLIENT_ID = 'test-client'
const CLIENT_SECRET = 'test-secret'
const REDIRECT_URI = 'http://identity.test/v1/auth/google/callback'

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo
      server.close(() => resolve(port))
    })
  })
}

describe('identity: bootstrap', () => {
  let postgres: TestPostgres
  let database: DbHandle

  const provision = () => {
    const auth = createAuthService({
      repository: createAuthRepository(database.db),
      google: {
        begin: async () => {
          throw new Error('bootstrap не открывает вход')
        },
        exchange: async () => {
          throw new Error('bootstrap не обменивает код')
        },
      },
      redirect_uri: REDIRECT_URI,
      superadmin_email: SUPERADMIN_EMAIL,
      session_ttl_days: 30,
    })
    return auth.provisionSuperadmin(SUPERADMIN_EMAIL)
  }

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
    expect(rows[0]).toMatchObject({ email: SUPERADMIN_EMAIL, role: 'superadmin', google_sub: null, can_publish: true })
    const events = await database.db.select().from(outbox)
    expect(events).toHaveLength(1)
    expect(events[0]?.name).toBe('identity.user.created')
    expect(Number((await database.pool.query<{ n: string }>('select count(*) as n from sessions')).rows[0]?.n)).toBe(0)
  })

  it('первый вход этой почты через mock-google привязывает sub и не плодит строку', async () => {
    const port = await freePort()
    const issuer = `http://127.0.0.1:${port}`
    const google = await buildMockGoogle(
      loadMockEnv({
        APP_ENV: 'local',
        HTTP_PORT: String(port),
        ISSUER_URL: issuer,
        CLIENT_ID,
        CLIENT_SECRET,
        REDIRECT_URI,
        SUPERADMIN_EMAIL,
      }),
      { quiet: true },
    )
    await google.listen({ host: '127.0.0.1', port })
    const app = Fastify()
    await app.register(requestContext, { logger })
    await app.register(errorHandler)
    await app.register(authRoutes, {
      database,
      env: {
        APP_ENV: 'local',
        GOOGLE_ISSUER_URL: issuer,
        GOOGLE_CLIENT_ID: CLIENT_ID,
        GOOGLE_CLIENT_SECRET: CLIENT_SECRET,
        GOOGLE_REDIRECT_URI: REDIRECT_URI,
        SUPERADMIN_EMAIL,
        SESSION_TTL_DAYS: 30,
      } as Env,
    })
    try {
      const start = await app.inject({ method: 'GET', url: '/v1/auth/google?return_to=/admin' })
      expect(start.statusCode).toBe(302)
      const authorize = new URL(start.headers.location ?? '')
      const form = new URLSearchParams([...authorize.searchParams.entries(), ['participant', 'superadmin']])
      const picked = await fetch(authorize.origin + '/authorize', { method: 'POST', body: form, redirect: 'manual' })
      expect(picked.status).toBe(302)
      const callback = new URL(picked.headers.get('location') ?? '')
      const done = await app.inject({ method: 'GET', url: `${callback.pathname}${callback.search}` })
      expect(done.statusCode).toBe(200)
      const [row] = await database.db.select().from(users).where(eq(users.email, SUPERADMIN_EMAIL))
      expect(row?.google_sub).toBe('seed-sub-superadmin')
      expect(await database.db.select().from(users)).toHaveLength(1)
    } finally {
      await app.close()
      await google.close()
    }
  }, 60_000)

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
