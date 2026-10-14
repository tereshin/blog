import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import type { Auth } from 'firebase-admin/auth'
import { createServiceClient } from '@blog/http-kit'
import type { ServiceClient } from '@blog/http-kit'
import { FirebaseEmailExistsError } from '../../modules/auth/index.ts'
import type { FirebaseGateway, VerifiedToken } from '../../modules/auth/index.ts'

export type FirebaseClientOptions = {
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

const EMULATOR_PROVIDERS = [{ id: 'password' }, { id: 'google.com' }, { id: 'github.com' }]

type ToolkitResponse = { status: number; body: Record<string, unknown> }

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
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

/** Identity Toolkit по REST. Эмулятор обслуживает его по префиксу пути на своём хосте. */
class IdentityToolkitClient {
  private readonly client: ServiceClient
  private readonly prefix: string
  private readonly key: string

  constructor(options: FirebaseClientOptions) {
    const origin = options.emulator_host ? `http://${options.emulator_host}` : 'https://identitytoolkit.googleapis.com'
    this.prefix = options.emulator_host ? '/identitytoolkit.googleapis.com' : ''
    this.client = createServiceClient({ name: 'firebase-identity-toolkit', base_url: origin })
    this.key = `key=${encodeURIComponent(options.server_api_key)}`
  }

  async post(method: string, body: Record<string, unknown>): Promise<ToolkitResponse> {
    const response = await this.client.request({ method: 'POST', path: `${this.prefix}/v1/${method}?${this.key}`, body })
    return { status: response.status, body: asRecord(response.body) }
  }

  async get(path: string): Promise<ToolkitResponse> {
    const response = await this.client.request({ path: `${this.prefix}${path}?${this.key}` })
    return { status: response.status, body: asRecord(response.body) }
  }

  close(): Promise<void> {
    return this.client.close()
  }
}

/** Клиент Firebase Admin и Identity Toolkit. В `local`/`dev` ходит в эмулятор, если он задан. */
export class FirebaseClient implements FirebaseGateway {
  private readonly auth: Auth
  private readonly toolkit: IdentityToolkitClient
  private readonly issuer: string

  constructor(private readonly options: FirebaseClientOptions) {
    if (getApps().length === 0) {
      if (options.emulator_host) initializeApp({ projectId: options.project_id })
      else {
        initializeApp({
          projectId: options.project_id,
          credential: cert({
            projectId: options.project_id,
            clientEmail: options.client_email,
            privateKey: options.private_key.replace(/\\n/g, '\n'),
          }),
        })
      }
    }
    this.auth = getAuth()
    this.toolkit = new IdentityToolkitClient(options)
    this.issuer = `https://securetoken.google.com/${options.project_id}`
  }

  async verifyIdToken(id_token: string): Promise<VerifiedToken> {
    const decoded = await this.auth.verifyIdToken(id_token)
    if (!this.options.emulator_host && decoded.iss !== this.issuer) throw new Error('чужой издатель ID-токена')
    if (decoded.aud !== this.options.project_id) throw new Error('чужой проект ID-токена')
    if (decoded.exp * 1000 <= Date.now()) throw new Error('ID-токен просрочен')
    const name = typeof decoded.name === 'string' ? decoded.name : null
    return {
      firebase_uid: decoded.uid,
      email: typeof decoded.email === 'string' ? decoded.email : null,
      email_verified: decoded.email_verified === true,
      name,
      provider_id: decoded.firebase?.sign_in_provider ?? 'unknown',
    }
  }

  async createUser(input: { email: string; password: string }): Promise<{ firebase_uid: string }> {
    const created = await this.toolkit.post('accounts:signUp', {
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
  }

  async deleteUser(firebase_uid: string): Promise<void> {
    await this.auth.deleteUser(firebase_uid)
  }

  async signInWithPassword(input: { email: string; password: string }): Promise<VerifiedToken | null> {
    const signed = await this.toolkit.post('accounts:signInWithPassword', {
      email: input.email,
      password: input.password,
      returnSecureToken: true,
    })
    if (signed.status >= 400) return null
    return tokenFromSignIn(signed.body, 'password')
  }

  async sendEmailVerification(firebase_uid: string): Promise<boolean> {
    const custom = await this.auth.createCustomToken(firebase_uid)
    const signed = await this.toolkit.post('accounts:signInWithCustomToken', { token: custom, returnSecureToken: true })
    const id_token = typeof signed.body.idToken === 'string' ? signed.body.idToken : null
    if (!id_token) return false
    const sent = await this.toolkit.post('accounts:sendOobCode', { requestType: 'VERIFY_EMAIL', idToken: id_token })
    return sent.status < 400
  }

  async confirmEmailVerification(oob_code: string): Promise<{ firebase_uid: string } | null> {
    const updated = await this.toolkit.post('accounts:update', { oobCode: oob_code })
    if (updated.status >= 400) return null
    const firebase_uid = typeof updated.body.localId === 'string' ? updated.body.localId : null
    if (!firebase_uid) return null
    return { firebase_uid }
  }

  async sendPasswordReset(email: string): Promise<void> {
    await this.toolkit.post('accounts:sendOobCode', { requestType: 'PASSWORD_RESET', email })
  }

  async confirmPasswordReset(input: { oob_code: string; password: string }): Promise<boolean> {
    const reset = await this.toolkit.post('accounts:resetPassword', { oobCode: input.oob_code, newPassword: input.password })
    return reset.status < 400
  }

  async listProviders(): Promise<{ id: string }[]> {
    const response = await this.toolkit.get(`/v2/projects/${this.options.project_id}/publicConfig`)
    if (response.status >= 400) {
      if (this.options.emulator_host) return EMULATOR_PROVIDERS
      throw new Error('конфигурация Firebase недоступна')
    }
    const sign_in = asRecord(response.body.signIn)
    const providers = Object.entries(sign_in)
      .filter(([, value]) => asRecord(value).enabled === true)
      .map(([key]) => ({ id: PROVIDER_KEYS[key] ?? key }))
    if (providers.length === 0 && this.options.emulator_host) return EMULATOR_PROVIDERS
    return providers
  }

  close(): Promise<void> {
    return this.toolkit.close()
  }
}
