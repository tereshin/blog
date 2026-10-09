import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

export type VerifiedToken = {
  firebase_uid: string
  email: string | null
  email_verified: boolean
  name: string | null
  provider_id: string
}

export type FirebaseGateway = {
  verifyIdToken: (id_token: string) => Promise<VerifiedToken>
  createUser: (input: { email: string; password: string }) => Promise<{ firebase_uid: string }>
  deleteUser: (firebase_uid: string) => Promise<void>
  signInWithPassword: (input: { email: string; password: string }) => Promise<VerifiedToken | null>
  sendEmailVerification: (firebase_uid: string) => Promise<boolean>
  confirmEmailVerification: (oob_code: string) => Promise<{ firebase_uid: string } | null>
  sendPasswordReset: (email: string) => Promise<void>
  confirmPasswordReset: (input: { oob_code: string; password: string }) => Promise<boolean>
  listProviders: () => Promise<{ id: string }[]>
}

export class FirebaseEmailExistsError extends Error {
  constructor() {
    super('адрес уже есть в Firebase')
    this.name = 'FirebaseEmailExistsError'
  }
}

type FirebaseEnv = {
  project_id: string
  server_api_key: string
  client_email: string
  private_key: string
  emulator_host?: string | undefined
}

const PROVIDER_KEYS: Record<string, string> = {
  email: 'password',
  google: 'google.com',
  github: 'github.com',
  facebook: 'facebook.com',
  twitter: 'twitter.com',
  apple: 'apple.com',
  microsoft: 'microsoft.com',
  yahoo: 'yahoo.com',
}

function toolkitBase(env: FirebaseEnv): string {
  if (env.emulator_host) return `http://${env.emulator_host}/identitytoolkit.googleapis.com/v1`
  return 'https://identitytoolkit.googleapis.com/v1'
}

async function postToolkit(env: FirebaseEnv, method: string, body: Record<string, unknown>): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(`${toolkitBase(env)}/${method}?key=${encodeURIComponent(env.server_api_key)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
  return { status: response.status, body: payload }
}

function errorMessage(body: Record<string, unknown>): string {
  const error = body.error
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    return typeof message === 'string' ? message : ''
  }
  return ''
}

function tokenFromSignIn(body: Record<string, unknown>, provider_id: string): VerifiedToken | null {
  const firebase_uid = typeof body.localId === 'string' ? body.localId : null
  if (!firebase_uid) return null
  return {
    firebase_uid,
    email: typeof body.email === 'string' ? body.email : null,
    email_verified: body.emailVerified === true,
    name: typeof body.displayName === 'string' ? body.displayName : null,
    provider_id,
  }
}

/** Клиент Firebase Admin и Identity Toolkit. В `local`/`dev` ходит в эмулятор, если он задан. */
export function createFirebaseGateway(env: FirebaseEnv): FirebaseGateway {
  if (env.emulator_host) process.env.FIREBASE_AUTH_EMULATOR_HOST = env.emulator_host
  if (getApps().length === 0) {
    if (env.emulator_host) initializeApp({ projectId: env.project_id })
    else {
      initializeApp({
        projectId: env.project_id,
        credential: cert({
          projectId: env.project_id,
          clientEmail: env.client_email,
          privateKey: env.private_key.replace(/\\n/g, '\n'),
        }),
      })
    }
  }
  const auth = getAuth()
  const issuer = `https://securetoken.google.com/${env.project_id}`

  return {
    async verifyIdToken(id_token) {
      const decoded = await auth.verifyIdToken(id_token)
      if (!env.emulator_host && decoded.iss !== issuer) throw new Error('чужой издатель ID-токена')
      if (decoded.aud !== env.project_id) throw new Error('чужой проект ID-токена')
      if (decoded.exp * 1000 <= Date.now()) throw new Error('ID-токен просрочен')
      const name = typeof decoded.name === 'string' ? decoded.name : null
      return {
        firebase_uid: decoded.uid,
        email: typeof decoded.email === 'string' ? decoded.email : null,
        email_verified: decoded.email_verified === true,
        name,
        provider_id: decoded.firebase?.sign_in_provider ?? 'unknown',
      }
    },

    async createUser(input) {
      const created = await postToolkit(env, 'accounts:signUp', {
        email: input.email,
        password: input.password,
        returnSecureToken: false,
      })
      if (created.status >= 400) {
        if (errorMessage(created.body).includes('EMAIL_EXISTS')) throw new FirebaseEmailExistsError()
        throw new Error('Firebase не создал пользователя')
      }
      const firebase_uid = typeof created.body.localId === 'string' ? created.body.localId : null
      if (!firebase_uid) throw new Error('Firebase не вернул uid')
      return { firebase_uid }
    },

    async deleteUser(firebase_uid) {
      await auth.deleteUser(firebase_uid)
    },

    async signInWithPassword(input) {
      const signed = await postToolkit(env, 'accounts:signInWithPassword', {
        email: input.email,
        password: input.password,
        returnSecureToken: true,
      })
      if (signed.status >= 400) return null
      return tokenFromSignIn(signed.body, 'password')
    },

    async sendEmailVerification(firebase_uid) {
      const custom = await auth.createCustomToken(firebase_uid)
      const signed = await postToolkit(env, 'accounts:signInWithCustomToken', { token: custom, returnSecureToken: true })
      const id_token = typeof signed.body.idToken === 'string' ? signed.body.idToken : null
      if (!id_token) return false
      const sent = await postToolkit(env, 'accounts:sendOobCode', { requestType: 'VERIFY_EMAIL', idToken: id_token })
      return sent.status < 400
    },

    async confirmEmailVerification(oob_code) {
      const updated = await postToolkit(env, 'accounts:update', { oobCode: oob_code })
      if (updated.status >= 400) return null
      const firebase_uid = typeof updated.body.localId === 'string' ? updated.body.localId : null
      if (!firebase_uid) return null
      return { firebase_uid }
    },

    async sendPasswordReset(email) {
      await postToolkit(env, 'accounts:sendOobCode', { requestType: 'PASSWORD_RESET', email })
    },

    async confirmPasswordReset(input) {
      const reset = await postToolkit(env, 'accounts:resetPassword', { oobCode: input.oob_code, newPassword: input.password })
      return reset.status < 400
    },

    async listProviders() {
      const response = await fetch(`${toolkitBase(env).replace('/v1', '/v2')}/projects/${env.project_id}/publicConfig?key=${encodeURIComponent(env.server_api_key)}`)
      if (!response.ok) {
        if (env.emulator_host) return [{ id: 'password' }, { id: 'google.com' }, { id: 'github.com' }]
        throw new Error('конфигурация Firebase недоступна')
      }
      const payload = (await response.json()) as { signIn?: Record<string, { enabled?: boolean }> }
      const sign_in = payload.signIn ?? {}
      const providers = Object.entries(sign_in)
        .filter(([, value]) => value?.enabled === true)
        .map(([key]) => ({ id: PROVIDER_KEYS[key] ?? key }))
      if (providers.length === 0 && env.emulator_host) return [{ id: 'password' }, { id: 'google.com' }, { id: 'github.com' }]
      return providers
    },
  }
}
