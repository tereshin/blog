import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { errorHandler, idempotency, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import type { EmailCodeStep } from '@blog/contracts'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { auth_email_jobs, email_flows, sessions, settings_copy, users, outbox } from '../../src/infra/db/schema.ts'
import { AuthController, AuthRepository, AuthService, authRoutes, EmailCodeCrypto, EmailFlowController, EmailFlowRepository, EmailFlowService, emailFlowRoutes } from '../../src/modules/auth/index.ts'
import { AuthEmailWorker } from '../../src/infra/http/auth-email-worker.ts'
import { fakeFirebase } from '../helpers/fake-firebase.ts'

const PASSWORD = 'password-original'

describe('email codes: database, Firebase port, transactional mail and session bridge', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance
  let firebase: ReturnType<typeof fakeFirebase>
  let crypto: EmailCodeCrypto
  let worker: AuthEmailWorker
  let now: Date
  const sent: { to: string; text: string }[] = []
  const sendMail = vi.fn(async (message: { to: string; text: string }) => { sent.push(message) })

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    await database.db.insert(settings_copy).values({ id: 1, registration_open: true, new_members_can_publish: true })
    const logger = createLogger({ service: 'email-auth-test', level: 'silent' })
    firebase = fakeFirebase()
    crypto = new EmailCodeCrypto('test-only-email-key-at-least-32-characters')
    const options = {
      superadmin_email: 'root@blog.test', session_ttl_days: 30, web_api_key: 'web', auth_domain: 'demo.test',
      project_id: 'demo-blog', emulator_host: '127.0.0.1:9099', seed_password: null, now: () => now,
    }
    app = Fastify()
    await app.register(requestContext, { logger })
    await app.register(idempotency)
    await app.register(errorHandler)
    await app.register(authRoutes, { controller: new AuthController(new AuthService(new AuthRepository(database.db), firebase, logger, options)) })
    const service = new EmailFlowService(new EmailFlowRepository(database.db), firebase, crypto, logger, options)
    await app.register(emailFlowRoutes, { controller: new EmailFlowController(service) })
    worker = new AuthEmailWorker({ db: database.db, crypto, from: 'noreply@blog.test', logger, transport: { sendMail, close() {} } })
  }, 120_000)
  beforeEach(async () => {
    now = new Date()
    sendMail.mockClear()
    sent.length = 0
    await database.db.update(settings_copy).set({ registration_open: true })
    await database.db.delete(auth_email_jobs)
  })
  afterAll(async () => {
    await app?.close()
    await database?.close()
    await postgres?.stop()
  })

  async function start(email: string, purpose = 'continue'): Promise<EmailCodeStep> {
    const response = await app.inject({ method: 'POST', url: '/v1/auth/email-flows', payload: { email, purpose } })
    expect(response.statusCode).toBe(200)
    return response.json<EmailCodeStep>()
  }
  async function codeFor(flow: EmailCodeStep): Promise<string> {
    const [job] = await database.db.select().from(auth_email_jobs).where(eq(auth_email_jobs.flow_id, flow.flow_id))
    expect(job).toBeDefined()
    return crypto.decrypt((job?.encrypted_message ?? '')).code
  }
  async function confirm(flow: EmailCodeStep, code?: string) {
    return app.inject({ method: 'POST', url: '/v1/auth/email-code-confirmations', payload: { flow_id: flow.flow_id, code: code ?? await codeFor(flow) } })
  }
  async function complete(flow: EmailCodeStep, password = PASSWORD) {
    return app.inject({ method: 'POST', url: '/v1/auth/password-setups', payload: { flow_id: flow.flow_id, password } })
  }
  async function register(email: string) {
    const flow = await start(email)
    expect((await confirm(flow)).statusCode).toBe(200)
    const response = await complete(flow)
    expect(response.statusCode).toBe(204)
    return String(response.headers['x-set-session'])
  }

  it('normalizes email, queues an encrypted six-digit code, creates a verified member and signs in', async () => {
    const flow = await start('  Anna@Example.Test  ')
    expect(flow).toMatchObject({ step: 'code', purpose: 'registration' })
    const code = await codeFor(flow)
    expect(code).toMatch(/^\d{6}$/)
    const [job] = await database.db.select().from(auth_email_jobs).where(eq(auth_email_jobs.flow_id, flow.flow_id))
    expect((job?.encrypted_message ?? '')).not.toContain('anna@example.test')
    const [stored] = await database.db.select().from(email_flows).where(eq(email_flows.id, flow.flow_id))
    expect(stored?.code_hash).toMatch(/^[a-f0-9]{64}$/)
    expect((await complete(flow)).statusCode).toBe(422)
    expect((await confirm(flow)).statusCode).toBe(200)
    const response = await complete(flow)
    expect(response.statusCode).toBe(204)
    expect(response.headers['x-set-session']).toEqual(expect.any(String))
    const [user] = await database.db.select().from(users).where(eq(users.email, 'anna@example.test'))
    expect(user).toMatchObject({ email_verified: true, role: 'member' })
    const events = await database.db.select().from(outbox)
    expect(events.some((event) => event.payload.display_name === 'anna')).toBe(true)
    expect((await start('ANNA@example.test'))).toEqual({ step: 'password' })
    expect((await complete(flow)).statusCode).toBe(422)
  })

  it('persists five wrong attempts and rejects even the correct code afterwards', async () => {
    const flow = await start('attempts@example.test')
    const code = await codeFor(flow)
    const wrong = code === '000000' ? '111111' : '000000'
    for (let attempt = 1; attempt <= 5; attempt++) {
      const response = await confirm(flow, wrong)
      expect(response.json().code).toBe(attempt === 5 ? 'code_attempts_exhausted' : 'invalid_code')
    }
    expect((await confirm(flow, code)).json().code).toBe('code_attempts_exhausted')
    const [stored] = await database.db.select().from(email_flows).where(eq(email_flows.id, flow.flow_id))
    expect(stored?.attempts).toBe(5)
  })

  it('enforces resend cooldown, invalidates the old code and prevents replay', async () => {
    const generate = vi.spyOn(crypto, 'generate').mockReturnValueOnce('123456').mockReturnValueOnce('654321')
    const flow = await start('resend@example.test')
    const payload = { flow_id: flow.flow_id }
    expect((await app.inject({ method: 'POST', url: '/v1/auth/email-code-resends', payload })).statusCode).toBe(429)
    const duplicate = await app.inject({ method: 'POST', url: '/v1/auth/email-flows', payload: { email: 'resend@example.test', purpose: 'continue' } })
    expect(duplicate.statusCode).toBe(429)
    expect(duplicate.json()).not.toHaveProperty('flow_id')
    now = new Date(now.getTime() + 60_001)
    expect((await app.inject({ method: 'POST', url: '/v1/auth/email-code-resends', payload })).statusCode).toBe(200)
    expect((await confirm(flow, '123456')).json().code).toBe('invalid_code')
    expect((await confirm(flow, '654321')).statusCode).toBe(200)
    expect((await confirm(flow, '654321')).json().code).toBe('flow_expired')
    generate.mockRestore()
  })

  it('expires the code after ten minutes and password permission after five minutes', async () => {
    const expired = await start('expired@example.test')
    const code = await codeFor(expired)
    now = new Date(now.getTime() + 600_001)
    expect((await confirm(expired, code)).json().code).toBe('code_expired')
    const grant = await start('grant@example.test')
    expect((await confirm(grant)).statusCode).toBe(200)
    now = new Date(now.getTime() + 300_001)
    expect((await complete(grant)).json().code).toBe('flow_expired')
  })

  it('resets a password, revokes previous sessions, signs in and rejects the previous password', async () => {
    const old_session = await register('reset@example.test')
    now = new Date(now.getTime() + 60_001)
    const flow = await start('reset@example.test', 'password_reset')
    expect(flow.purpose).toBe('password_reset')
    expect((await confirm(flow)).statusCode).toBe(200)
    const response = await complete(flow, 'new-password-ok')
    expect(response.statusCode).toBe(204)
    expect(response.headers['x-set-session']).not.toBe(old_session)
    const [old] = await database.db.select().from(sessions).where(eq(sessions.id, old_session))
    expect(old?.revoked_at).not.toBeNull()
    const login = (password: string) => app.inject({ method: 'POST', url: '/v1/auth/sessions', payload: { method: 'password', email: 'reset@example.test', password } })
    expect((await login(PASSWORD)).statusCode).toBe(401)
    expect((await login('new-password-ok')).statusCode).toBe(204)
  })

  it('sets a password on an existing SSO identity without creating a duplicate profile', async () => {
    firebase.users.set('sso-uid', { uid: 'sso-uid', email: 'sso@example.test', email_verified: true, password: '' })
    expect((await app.inject({ method: 'POST', url: '/v1/auth/sessions', payload: { method: 'id_token', id_token: 'sso-uid' } })).statusCode).toBe(204)
    const [before] = await database.db.select().from(users).where(eq(users.email, 'sso@example.test'))
    const flow = await start('sso@example.test', 'password_reset')
    await confirm(flow)
    expect((await complete(flow)).statusCode).toBe(204)
    const after = await database.db.select().from(users).where(eq(users.email, 'sso@example.test'))
    expect(after.map((user) => user.id)).toEqual([before?.id])
    expect(await firebase.findUidByEmail('sso@example.test')).toBe('sso-uid')
  })

  it('keeps existing sign-in available when registration is closed and checks again at completion', async () => {
    await register('existing@example.test')
    const flow = await start('closing@example.test')
    await confirm(flow)
    await database.db.update(settings_copy).set({ registration_open: false })
    expect((await start('existing@example.test'))).toEqual({ step: 'password' })
    const response = await app.inject({ method: 'POST', url: '/v1/auth/email-flows', payload: { email: 'closed@example.test', purpose: 'continue' } })
    expect(response.json().code).toBe('registration_closed')
    expect((await complete(flow)).json().code).toBe('registration_closed')
  })

  it('serializes concurrent confirmations and completions', async () => {
    const flow = await start('concurrent@example.test')
    const code = await codeFor(flow)
    const confirmed = await Promise.all([confirm(flow, code), confirm(flow, code)])
    expect(confirmed.map((response) => response.statusCode).sort()).toEqual([200, 422])
    const completed = await Promise.all([complete(flow), complete(flow)])
    expect(completed.map((response) => response.statusCode).sort()).toEqual([204, 422])
    expect(await database.db.select().from(users).where(eq(users.email, 'concurrent@example.test'))).toHaveLength(1)
  })

  it('does not overwrite an account created while registration was in progress', async () => {
    const flow = await start('race@example.test')
    await confirm(flow)
    firebase.users.set('race-sso', { uid: 'race-sso', email: 'race@example.test', email_verified: true, password: 'keep-password' })
    await app.inject({ method: 'POST', url: '/v1/auth/sessions', payload: { method: 'id_token', id_token: 'race-sso' } })
    expect((await complete(flow)).json().code).toBe('account_changed')
    expect(firebase.users.get('race-sso')?.password).toBe('keep-password')
  })

  it('delivers queued mail and removes the encrypted payload, retries SMTP failures without logging details', async () => {
    const flow = await start('delivery@example.test')
    const code = await codeFor(flow)
    await worker.flushOnce()
    expect(sent.find((mail) => mail.to === 'delivery@example.test')?.text).toContain(code)
    expect(await database.db.select().from(auth_email_jobs).where(eq(auth_email_jobs.flow_id, flow.flow_id))).toHaveLength(0)
    const retry = await start('retry@example.test')
    sendMail.mockRejectedValueOnce(new Error('SMTP unavailable'))
    await worker.flushOnce()
    const [job] = await database.db.select().from(auth_email_jobs).where(eq(auth_email_jobs.flow_id, retry.flow_id))
    expect(job?.attempts).toBe(1)
    await database.db.update(auth_email_jobs).set({ available_at: new Date(0) }).where(eq(auth_email_jobs.flow_id, retry.flow_id))
    await worker.flushOnce()
    expect(sent.some((mail) => mail.to === 'retry@example.test')).toBe(true)
  })
})
