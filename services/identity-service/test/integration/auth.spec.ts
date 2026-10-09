import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { errorHandler, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import type { Env } from '../../src/config/env.ts'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { auth_identities, outbox, settings_copy, users } from '../../src/infra/db/schema.ts'
import { authRoutes } from '../../src/modules/auth/index.ts'
import type { FirebaseGateway, VerifiedToken } from '../../src/modules/auth/firebase-admin.ts'

type FakeUser = { uid: string; email: string; password: string; email_verified: boolean }

function fakeFirebase(): FirebaseGateway & { users: Map<string, FakeUser>; codes: Map<string, string> } {
  const users = new Map<string, FakeUser>()
  const codes = new Map<string, string>()
  let seq = 0
  const gateway: FirebaseGateway & { users: Map<string, FakeUser>; codes: Map<string, string> } = {
    users,
    codes,
    async verifyIdToken(id_token) {
      const user = [...users.values()].find((row) => row.uid === id_token)
      if (!user) throw new Error('bad token')
      return { firebase_uid: user.uid, email: user.email, email_verified: user.email_verified, name: null, provider_id: 'google.com' }
    },
    async createUser(input) {
      if ([...users.values()].some((row) => row.email === input.email)) throw new Error('EMAIL_EXISTS')
      const uid = `uid-${++seq}`
      users.set(uid, { uid, email: input.email, password: input.password, email_verified: false })
      return { uid: uid } as never
    },
    async deleteUser(firebase_uid) {
      users.delete(firebase_uid)
    },
    async signInWithPassword(input) {
      const user = [...users.values()].find((row) => row.email === input.email && row.password === input.password)
      if (!user) return null
      const token: VerifiedToken = {
        firebase_uid: user.uid,
        email: user.email,
        email_verified: user.email_verified,
        name: null,
        provider_id: 'password',
      }
      return token
    },
    async sendEmailVerification(firebase_uid) {
      const user = users.get(firebase_uid)
      if (!user) return false
      codes.set(`verify-${user.email}`, firebase_uid)
      return true
    },
    async confirmEmailVerification(oob_code) {
      const firebase_uid = codes.get(oob_code) ?? null
      if (!firebase_uid) return null
      const user = users.get(firebase_uid)
      if (user) user.email_verified = true
      return { firebase_uid }
    },
    async sendPasswordReset(email) {
      const user = [...users.values()].find((row) => row.email === email)
      if (user) codes.set(`reset-${email}`, user.uid)
    },
    async confirmPasswordReset(input) {
      const firebase_uid = [...codes.entries()].find(([code]) => code === input.oob_code)?.[1]
      if (!firebase_uid) return false
      const user = users.get(firebase_uid)
      if (!user) return false
      user.password = input.password
      return true
    },
    async listProviders() {
      return [{ id: 'password' }, { id: 'google.com' }, { id: 'github.com' }]
    },
  }
  // createUser return type uses firebase_uid
  gateway.createUser = async (input) => {
    if ([...users.values()].some((row) => row.email === input.email)) {
      const error = new Error('адрес уже есть в Firebase')
      error.name = 'FirebaseEmailExistsError'
      throw error
    }
    const firebase_uid = `uid-${++seq}`
    users.set(firebase_uid, { uid: firebase_uid, email: input.email, password: input.password, email_verified: false })
    return { firebase_uid }
  }
  return gateway
}

describe('identity: вход через Firebase', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance
  let firebase: ReturnType<typeof fakeFirebase>

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    await database.db.insert(settings_copy).values({ id: 1, registration_open: true, new_members_can_publish: true })
    firebase = fakeFirebase()
    app = Fastify()
    await app.register(requestContext, { logger: createLogger({ service: 'identity-test', level: 'silent' }) })
    await app.register(errorHandler)
    await app.register(authRoutes, {
      database,
      firebase,
      env: {
        APP_ENV: 'local',
        SUPERADMIN_EMAIL: 'root@example.test',
        SESSION_TTL_DAYS: 30,
        FIREBASE_PROJECT_ID: 'demo-blog',
        FIREBASE_AUTH_DOMAIN: 'demo.test',
        FIREBASE_WEB_API_KEY: 'web',
        FIREBASE_SERVER_API_KEY: 'server',
        FIREBASE_CLIENT_EMAIL: 'a@b.c',
        FIREBASE_PRIVATE_KEY: 'key',
        FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
        SEED_AUTH_PASSWORD: 'seed-password',
      } as Env,
    })
  }, 120_000)

  afterAll(async () => {
    await app.close()
    await database.close()
    await postgres.stop()
  })

  it('открытая регистрация отвечает pending без cookie и создаёт неподтверждённую строку', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/registrations',
      headers: { 'x-idempotency-key': 'reg-1' },
      payload: { email: 'Anna@blog.test', password: 'password1' },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'pending' })
    expect(response.headers['set-cookie']).toBeUndefined()
    expect(response.headers['x-set-session']).toBeUndefined()
    const [row] = await database.db.select().from(users).where(eq(users.email, 'anna@blog.test'))
    expect(row?.email_verified).toBe(false)
    const created = await database.db.select().from(outbox)
    expect(created[0]?.payload).toMatchObject({ display_name: 'anna' })
  })

  it('короткий пароль и адрес без @ не создают строку', async () => {
    const before = await database.db.select().from(users)
    const short = await app.inject({ method: 'POST', url: '/v1/auth/registrations', payload: { email: 'short@blog.test', password: '1234567' } })
    const bad = await app.inject({ method: 'POST', url: '/v1/auth/registrations', payload: { email: 'not-an-email', password: 'password1' } })
    expect(short.statusCode).toBe(422)
    expect(bad.statusCode).toBe(422)
    expect(await database.db.select().from(users)).toHaveLength(before.length)
    expect(firebase.users.size).toBe(1)
  })

  it('занятый адрес отвечает тем же pending и не создаёт вторую строку', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/registrations',
      payload: { email: 'anna@blog.test', password: 'password1' },
    })
    expect(response.json()).toEqual({ status: 'pending' })
    expect(await database.db.select().from(users)).toHaveLength(1)
  })

  it('повтор с тем же ключом не создаёт вторую строку', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/auth/registrations',
      headers: { 'x-idempotency-key': 'reg-1' },
      payload: { email: 'other@blog.test', password: 'password1' },
    })
    expect(await database.db.select().from(users)).toHaveLength(1)
  })

  it('пароль неподтверждённой почты открывает сессию, неверный пароль — один отказ', async () => {
    const ok = await app.inject({
      method: 'POST',
      url: '/v1/auth/sessions',
      payload: { method: 'password', email: 'anna@blog.test', password: 'password1' },
    })
    expect(ok.statusCode).toBe(204)
    expect(ok.headers['x-set-session']).toEqual(expect.any(String))
    const session_id = String(ok.headers['x-set-session'])
    const current = await app.inject({ method: 'GET', url: '/v1/auth/session', headers: { 'x-session-id': session_id } })
    expect(current.json().user).toMatchObject({ email: 'anna@blog.test', email_verified: false })
    const bad = await app.inject({
      method: 'POST',
      url: '/v1/auth/sessions',
      payload: { method: 'password', email: 'missing@blog.test', password: 'password1' },
    })
    expect(bad.statusCode).toBe(401)
    expect(bad.json().code).toBe('invalid_credentials')
  })

  it('код подтверждения ставит email_verified и сам сессию не открывает', async () => {
    const code = 'verify-anna@blog.test'
    const response = await app.inject({ method: 'POST', url: '/v1/auth/email-verification-confirmations', payload: { oob_code: code } })
    expect(response.statusCode).toBe(200)
    expect(response.headers['x-set-session']).toBeUndefined()
    const [row] = await database.db.select().from(users).where(eq(users.email, 'anna@blog.test'))
    expect(row?.email_verified).toBe(true)
  })

  it('сброс на отсутствующий адрес отвечает тем же успехом, короткий пароль не сохраняется', async () => {
    const missing = await app.inject({ method: 'POST', url: '/v1/auth/password-resets', payload: { email: 'nobody@blog.test' } })
    const known = await app.inject({ method: 'POST', url: '/v1/auth/password-resets', payload: { email: 'anna@blog.test' } })
    expect(missing.json()).toEqual(known.json())
    const short = await app.inject({
      method: 'POST',
      url: '/v1/auth/password-reset-confirmations',
      payload: { oob_code: 'reset-anna@blog.test', password: 'short' },
    })
    expect(short.statusCode).toBe(422)
    expect(firebase.users.get('uid-1')?.password).toBe('password1')
  })

  it('маршрутов Google больше нет', async () => {
    expect((await app.inject({ method: 'GET', url: '/v1/auth/google' })).statusCode).toBe(404)
    expect((await app.inject({ method: 'GET', url: '/v1/auth/google/callback' })).statusCode).toBe(404)
  })

  it('закрытая регистрация отвечает одним отказом и новому, и занятому адресу', async () => {
    await database.db.update(settings_copy).set({ registration_open: false }).where(eq(settings_copy.id, 1))
    const fresh = await app.inject({ method: 'POST', url: '/v1/auth/registrations', payload: { email: 'new@blog.test', password: 'password1' } })
    const taken = await app.inject({ method: 'POST', url: '/v1/auth/registrations', payload: { email: 'anna@blog.test', password: 'password1' } })
    expect(fresh.json().code).toBe('registration_closed')
    expect(taken.json().code).toBe('registration_closed')
    expect(await database.db.select().from(users)).toHaveLength(1)
    expect(await database.db.select().from(auth_identities)).toHaveLength(1)
  })
})
