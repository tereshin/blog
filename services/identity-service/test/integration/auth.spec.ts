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

function fakeFirebase(): FirebaseGateway & { users: Map<string, FakeUser>; codes: Map<string, string>; sent_verification: string[] } {
  const users = new Map<string, FakeUser>()
  const codes = new Map<string, string>()
  const sent_verification: string[] = []
  let seq = 0
  const gateway: FirebaseGateway & { users: Map<string, FakeUser>; codes: Map<string, string>; sent_verification: string[] } = {
    users,
    codes,
    sent_verification,
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
      sent_verification.push(firebase_uid)
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
  }, 120_000)

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

  it('два входа с одной подтверждённой почтой оставляют одну строку и оба uid', async () => {
    await database.db.update(settings_copy).set({ registration_open: true }).where(eq(settings_copy.id, 1))
    firebase.users.set('uid-merge-a', { uid: 'uid-merge-a', email: 'merge@blog.test', password: 'x', email_verified: true })
    firebase.users.set('uid-merge-b', { uid: 'uid-merge-b', email: 'merge@blog.test', password: 'x', email_verified: true })
    const [first, second] = await Promise.all([
      app.inject({ method: 'POST', url: '/v1/auth/sessions', payload: { method: 'id_token', id_token: 'uid-merge-a' } }),
      app.inject({ method: 'POST', url: '/v1/auth/sessions', payload: { method: 'id_token', id_token: 'uid-merge-b' } }),
    ])
    expect(first.statusCode).toBe(204)
    expect(second.statusCode).toBe(204)
    const rows = await database.db.select().from(users).where(eq(users.email, 'merge@blog.test'))
    expect(rows).toHaveLength(1)
    const links = await database.db.select().from(auth_identities).where(eq(auth_identities.user_id, rows[0]!.id))
    expect(links.map((link) => link.firebase_uid).sort()).toEqual(['uid-merge-a', 'uid-merge-b'])
  })

  it('подтверждённая почта существующего участника дописывает uid и не создаёт вторую строку', async () => {
    const before = await database.db.select().from(users)
    const [anna] = await database.db.select().from(users).where(eq(users.email, 'anna@blog.test'))
    firebase.users.set('uid-anna-google', { uid: 'uid-anna-google', email: 'anna@blog.test', password: 'x', email_verified: true })
    const created_before = (await database.db.select().from(outbox)).length
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/sessions',
      payload: { method: 'id_token', id_token: 'uid-anna-google' },
    })
    expect(response.statusCode).toBe(204)
    expect(await database.db.select().from(users)).toHaveLength(before.length)
    const [same] = await database.db.select().from(users).where(eq(users.email, 'anna@blog.test'))
    expect(same?.role).toBe(anna?.role)
    expect(same?.restricted_at).toEqual(anna?.restricted_at ?? null)
    const links = await database.db.select().from(auth_identities).where(eq(auth_identities.firebase_uid, 'uid-anna-google'))
    expect(links[0]?.user_id).toBe(anna?.id)
    expect((await database.db.select().from(outbox)).length).toBe(created_before)
  })

  it('uid чужой учётки не переносит почту с токена', async () => {
    firebase.users.set('uid-cross', { uid: 'uid-cross', email: 'cross@blog.test', password: 'x', email_verified: true })
    await app.inject({ method: 'POST', url: '/v1/auth/sessions', payload: { method: 'id_token', id_token: 'uid-cross' } })
    firebase.users.set('uid-cross', { uid: 'uid-cross', email: 'anna@blog.test', password: 'x', email_verified: true })
    const response = await app.inject({ method: 'POST', url: '/v1/auth/sessions', payload: { method: 'id_token', id_token: 'uid-cross' } })
    expect(response.statusCode).toBe(204)
    const [cross] = await database.db.select().from(users).where(eq(users.email, 'cross@blog.test'))
    const [anna] = await database.db.select().from(users).where(eq(users.email, 'anna@blog.test'))
    expect(cross?.email).toBe('cross@blog.test')
    expect(anna?.email).toBe('anna@blog.test')
    const link = await database.db.select().from(auth_identities).where(eq(auth_identities.firebase_uid, 'uid-cross'))
    expect(link[0]?.user_id).toBe(cross?.id)
  })

  it('неподтверждённый адрес из токена не пишет users.email и чужую учётку не открывает', async () => {
    const before = await database.db.select().from(users)
    firebase.users.set('uid-hidden', { uid: 'uid-hidden', email: 'anna@blog.test', password: 'x', email_verified: false })
    const response = await app.inject({ method: 'POST', url: '/v1/auth/sessions', payload: { method: 'id_token', id_token: 'uid-hidden' } })
    expect(response.statusCode).toBe(204)
    const session_id = String(response.headers['x-set-session'])
    const current = await app.inject({ method: 'GET', url: '/v1/auth/session', headers: { 'x-session-id': session_id } })
    expect(current.json().user.email).toBeNull()
    expect(current.json().user.email_verified).toBe(false)
    expect(await database.db.select().from(users).where(eq(users.email, 'anna@blog.test'))).toHaveLength(1)
    expect((await database.db.select().from(users)).length).toBe(before.length + 1)
  })

  it('указание почты: свободный адрес пишется, чужой — нет, повтор своего только шлёт письмо', async () => {
    const hidden = await app.inject({ method: 'POST', url: '/v1/auth/sessions', payload: { method: 'id_token', id_token: 'uid-hidden' } })
    const session_id = String(hidden.headers['x-set-session'])
    const headers = { 'x-session-id': session_id, 'x-idempotency-key': 'claim-1' }
    const free = await app.inject({ method: 'POST', url: '/v1/auth/email-claims', headers, payload: { email: 'fresh@blog.test' } })
    expect(free.json()).toEqual({ status: 'pending' })
    const mine = await app.inject({ method: 'GET', url: '/v1/auth/session', headers: { 'x-session-id': session_id } })
    expect(mine.json().user).toMatchObject({ email: 'fresh@blog.test', email_verified: false })
    expect(firebase.sent_verification).toContain('uid-hidden')

    const taken = await app.inject({
      method: 'POST',
      url: '/v1/auth/email-claims',
      headers: { 'x-session-id': session_id, 'x-idempotency-key': 'claim-taken' },
      payload: { email: 'anna@blog.test' },
    })
    expect(taken.json()).toEqual({ status: 'pending' })
    const still = await app.inject({ method: 'GET', url: '/v1/auth/session', headers: { 'x-session-id': session_id } })
    expect(still.json().user.email).toBe('fresh@blog.test')

    const again = await app.inject({
      method: 'POST',
      url: '/v1/auth/email-claims',
      headers: { 'x-session-id': session_id, 'x-idempotency-key': 'claim-again' },
      payload: { email: 'fresh@blog.test' },
    })
    expect(again.json()).toEqual({ status: 'pending' })
    expect(still.json().user.email_verified).toBe(false)

    const bad = await app.inject({
      method: 'POST',
      url: '/v1/auth/email-claims',
      headers: { 'x-session-id': session_id },
      payload: { email: 'not-an-email' },
    })
    expect(bad.statusCode).toBe(422)
    expect((await app.inject({ method: 'GET', url: '/v1/auth/session', headers: { 'x-session-id': session_id } })).json().user.email).toBe('fresh@blog.test')

    const replay = await app.inject({
      method: 'POST',
      url: '/v1/auth/email-claims',
      headers,
      payload: { email: 'anna@blog.test' },
    })
    expect(replay.json()).toEqual({ status: 'pending' })
    expect((await app.inject({ method: 'GET', url: '/v1/auth/session', headers: { 'x-session-id': session_id } })).json().user.email).toBe('fresh@blog.test')
  })
})
