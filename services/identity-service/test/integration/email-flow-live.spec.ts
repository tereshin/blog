import { execFile } from 'node:child_process'
import { generateKeyPairSync, randomUUID } from 'node:crypto'
import { promisify } from 'node:util'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { createLogger } from '@blog/logger'
import { createServiceMetrics } from '@blog/telemetry'
import type { EmailCodeStep } from '@blog/contracts'
import { buildApp } from '../../src/app.ts'
import { loadEnv } from '../../src/config/env.ts'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'

const exec = promisify(execFile)
const is_live = process.env['AUTH_LIVE_TESTS'] === '1'

// Requires the repo's emulator image (docker build -f infra/docker/firebase-auth.Dockerfile -t blog/firebase-auth:local .).
// Uses isolated containers, randomly published ports, real SMTP and real Firebase Admin/Toolkit requests.
describe.skipIf(!is_live)('live Firebase Emulator + SMTP/Mailpit', () => {
  const suffix = randomUUID().slice(0, 8)
  const emulator = `blog-auth-check-firebase-${suffix}`
  const mail = `blog-auth-check-mail-${suffix}`
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance
  let mail_url: string
  let metrics: ReturnType<typeof createServiceMetrics>

  async function port(container: string, internal: string): Promise<number> {
    const { stdout } = await exec('docker', ['port', container, internal])
    return Number(stdout.trim().split(':').at(-1))
  }
  beforeAll(async () => {
    await exec('docker', ['run', '--rm', '-d', '--name', emulator, '-p', '127.0.0.1::9099',
      '-e', 'FIREBASE_PROJECT_ID=demo-blog', 'blog/firebase-auth:local'])
    await exec('docker', ['run', '--rm', '-d', '--name', mail, '-p', '127.0.0.1::8025', '-p', '127.0.0.1::1025', 'axllent/mailpit:v1.27.8'])
    const emulator_host = `127.0.0.1:${await port(emulator, '9099/tcp')}`
    mail_url = `http://127.0.0.1:${await port(mail, '8025/tcp')}`
    await vi.waitFor(async () => {
      const response = await fetch(`http://${emulator_host}/`)
      if (response.status >= 500) throw new Error('Emulator is not ready')
    }, { timeout: 60_000, interval: 250 })
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    const env = loadEnv({
      APP_ENV: 'local', DATABASE_URL: postgres.url, NATS_URL: 'nats://127.0.0.1:4222',
      SERVICE_JWT_PUBLIC_KEY: generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' }).toString(),
      FIREBASE_PROJECT_ID: 'demo-blog', FIREBASE_AUTH_DOMAIN: 'demo-blog.firebaseapp.com',
      FIREBASE_WEB_API_KEY: 'demo-key', FIREBASE_SERVER_API_KEY: 'demo-key', FIREBASE_CLIENT_EMAIL: 'unused@example.test', FIREBASE_PRIVATE_KEY: 'unused',
      FIREBASE_AUTH_EMULATOR_HOST: emulator_host, SUPERADMIN_EMAIL: 'root@blog.test',
      AUTH_EMAIL_SECRET: 'live-test-only-email-secret-at-least-32-chars',
      SMTP_HOST: '127.0.0.1', SMTP_PORT: String(await port(mail, '1025/tcp')), SMTP_FROM: 'noreply@blog.test',
    })
    metrics = createServiceMetrics('email-flow-live-test')
    app = await buildApp({ env, logger: createLogger({ service: 'auth-live', level: 'silent' }), metrics, database, is_broker_ready: () => true })
    await app.ready()
  }, 120_000)
  afterAll(async () => {
    await app?.close()
    metrics?.stop()
    await database?.close()
    await postgres?.stop()
    await Promise.allSettled([exec('docker', ['rm', '-f', emulator]), exec('docker', ['rm', '-f', mail])])
  }, 60_000)

  async function post(path: string, payload: object) {
    return app.inject({ method: 'POST', url: `/v1/auth/${path}`, payload })
  }
  async function emailedCode(email: string): Promise<string> {
    let code = ''
    await expect.poll(async () => {
      const response = await fetch(`${mail_url}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)
      const list = await response.json() as { messages: { ID: string }[] }
      const id = list.messages[0]?.ID
      if (!id) return false
      const message = await fetch(`${mail_url}/api/v1/message/${id}`)
      const body = await message.json() as { Text: string }
      code = body.Text.match(/\b\d{6}\b/)?.[0] ?? ''
      return Boolean(code)
    }, { timeout: 20_000, interval: 250 }).toBe(true)
    return code
  }
  async function complete(email: string, purpose: string, password: string) {
    const response = await post('email-flows', { email, purpose })
    expect(response.statusCode).toBe(200)
    const flow = response.json<EmailCodeStep>()
    expect(flow.step).toBe('code')
    expect((await post('email-code-confirmations', { flow_id: flow.flow_id, code: await emailedCode(email) })).statusCode).toBe(200)
    const finished = await post('password-setups', { flow_id: flow.flow_id, password })
    expect(finished.statusCode, finished.body).toBe(204)
    const session_id = String(finished.headers['x-set-session'])
    const session = await app.inject({ method: 'GET', url: '/v1/auth/session', headers: { 'x-session-id': session_id } })
    expect(session.json().user).toMatchObject({ email, email_verified: true })
  }

  it('registers using a real email and authenticates the new Firebase password', async () => {
    const email = 'registration-live@blog.test'
    await complete(email, 'continue', 'new-password-ok')
    expect((await post('sessions', { method: 'password', email, password: 'new-password-ok' })).statusCode).toBe(204)
  }, 30_000)

  it('recovers an existing account and rejects the old Firebase password', async () => {
    const email = 'recovery-live@blog.test'
    expect((await post('registrations', { email, password: 'old-password-ok' })).statusCode).toBe(200)
    expect((await post('email-flows', { email, purpose: 'continue' })).json()).toEqual({ step: 'password' })
    await complete(email, 'password_reset', 'reset-password-ok')
    expect((await post('sessions', { method: 'password', email, password: 'old-password-ok' })).statusCode).toBe(401)
    expect((await post('sessions', { method: 'password', email, password: 'reset-password-ok' })).statusCode).toBe(204)
  }, 30_000)
})
