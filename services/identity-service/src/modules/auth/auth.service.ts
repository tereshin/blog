import { randomBytes } from 'node:crypto'
import type { Logger } from '@blog/logger'
import { PARTICIPANT_DEFS } from '@blog/seed-data'
import {
  AccountConflictError,
  AuthFieldError,
  AuthProviderError,
  FirebaseEmailExistsError,
  InvalidCredentialsError,
  RegistrationClosedError,
} from './auth.errors.ts'
import { decideSignIn, displayNameFromEmail, looksLikeEmail, normalizeEmail } from './auth.policy.ts'
import type { AccountUser, AuthRepositoryPort, AuthServiceOptions, FirebaseGateway, MemberSession, VerifiedToken } from './auth.types.ts'

const DAY_MS = 24 * 60 * 60 * 1000
const MIN_PASSWORD = 8
const PROVIDER_CACHE_MS = 60_000

const PENDING = { status: 'pending' as const }
const OK = { status: 'ok' as const }

type SignInBody = { method: 'password'; email: string; password: string } | { method: 'id_token'; id_token: string }
type NewSession = { session_id: string; expires_at: Date; max_age_seconds: number }

function newSessionId(): string {
  return randomBytes(18).toString('base64url')
}

function assertEmail(email: string): string {
  if (!looksLikeEmail(email)) throw new AuthFieldError('email', 'Адрес не похож на почту')
  return normalizeEmail(email)
}

function assertPassword(password: string): void {
  if (password.length < MIN_PASSWORD) throw new AuthFieldError('password', 'Пароль короче 8 символов')
}

function toMember(user: AccountUser): MemberSession {
  return {
    status: 'member',
    user: {
      id: user.id,
      public_number: user.public_number,
      role: user.role,
      can_publish: user.can_publish,
      is_restricted: user.restricted_at !== null,
      appearance: user.appearance,
      email: user.email === '' ? null : user.email,
      email_verified: user.email_verified,
    },
    display_name_hint: user.email === '' ? 'Участник' : displayNameFromEmail(user.email),
  }
}

export class AuthService {
  private readonly now: () => Date
  private providers_cache: { at: number; providers: { id: string }[] } | null = null

  constructor(
    private readonly repository: AuthRepositoryPort,
    private readonly firebase: FirebaseGateway,
    private readonly logger: Pick<Logger, 'warn'>,
    private readonly options: AuthServiceOptions,
  ) {
    this.now = options.now ?? (() => new Date())
  }

  async register(input: { email: string; password: string; display_name?: string; idempotency_key: string | null; correlation_id: string }): Promise<typeof PENDING> {
    const email = assertEmail(input.email)
    assertPassword(input.password)
    if (input.idempotency_key && !(await this.repository.claimIdempotency('registration', input.idempotency_key))) return PENDING

    const settings = await this.repository.readSettings()
    if (!settings.registration_open) throw new RegistrationClosedError()

    const taken = await this.repository.findByEmail(email)
    if (taken) return PENDING

    let firebase_uid: string
    try {
      const created = await this.firebase.createUser({ email, password: input.password })
      firebase_uid = created.firebase_uid
    } catch (error) {
      if (error instanceof FirebaseEmailExistsError) return PENDING
      throw error
    }

    try {
      await this.repository.createMember({
        email,
        email_verified: false,
        firebase_uid,
        provider_id: 'password',
        role: 'member',
        can_publish: settings.new_members_can_publish,
        display_name: input.display_name?.trim() || displayNameFromEmail(email),
        session_id: null,
        expires_at: null,
        correlation_id: input.correlation_id,
      })
    } catch (error) {
      if (!(error instanceof AccountConflictError)) throw error
      await this.deleteOrphan(firebase_uid)
      return PENDING
    }
    await this.bestEffort('sendEmailVerification', this.firebase.sendEmailVerification(firebase_uid))
    return PENDING
  }

  async signIn(input: { body: SignInBody; correlation_id: string }): Promise<{ session_id: string; max_age_seconds: number }> {
    if (input.body.method === 'password') {
      if (!looksLikeEmail(input.body.email)) throw new InvalidCredentialsError()
      const email = normalizeEmail(input.body.email)
      const token = await this.firebase.signInWithPassword({ email, password: input.body.password })
      const user = token ? await this.repository.findByEmail(email) : null
      if (!token || !user) throw new InvalidCredentialsError()
      const session = this.newSession()
      await this.repository.openSession({ user_id: user.id, session_id: session.session_id, expires_at: session.expires_at })
      return { session_id: session.session_id, max_age_seconds: session.max_age_seconds }
    }

    let token: VerifiedToken
    try {
      token = await this.firebase.verifyIdToken(input.body.id_token)
    } catch (error) {
      throw new AuthProviderError(error)
    }
    const [by_uid, by_email, settings] = await Promise.all([
      this.repository.findByUid(token.firebase_uid),
      token.email_verified && token.email ? this.repository.findByEmail(token.email) : Promise.resolve(null),
      this.repository.readSettings(),
    ])
    const decision = decideSignIn({ token, by_uid, by_email, settings })
    if (decision.action === 'reject') {
      await this.deleteOrphan(token.firebase_uid)
      throw new RegistrationClosedError()
    }
    const session = this.newSession()
    try {
      if (decision.action === 'login') {
        if (decision.attach_uid) {
          await this.repository.attachUid({
            user_id: decision.user.id,
            firebase_uid: token.firebase_uid,
            provider_id: token.provider_id,
            email_verified: token.email_verified,
          })
        }
        await this.repository.openSession({ user_id: decision.user.id, session_id: session.session_id, expires_at: session.expires_at })
      } else {
        await this.repository.createMember({
          email: decision.email ?? '',
          email_verified: decision.email_verified,
          firebase_uid: token.firebase_uid,
          provider_id: token.provider_id,
          role: decision.role,
          can_publish: decision.can_publish,
          display_name: decision.display_name,
          session_id: session.session_id,
          expires_at: session.expires_at,
          correlation_id: input.correlation_id,
        })
      }
    } catch (error) {
      if (!(error instanceof AccountConflictError) || !token.email) throw error
      const winner = await this.repository.findByEmail(token.email)
      if (!winner) throw error
      await this.bestEffort('attachUid', this.repository.attachUid({
        user_id: winner.id,
        firebase_uid: token.firebase_uid,
        provider_id: token.provider_id,
        email_verified: true,
      }))
      await this.repository.openSession({ user_id: winner.id, session_id: session.session_id, expires_at: session.expires_at })
    }
    return { session_id: session.session_id, max_age_seconds: session.max_age_seconds }
  }

  async claimEmail(input: { session_id: string | undefined; email: string; idempotency_key: string | null }): Promise<typeof PENDING> {
    const user = input.session_id ? await this.repository.findBySession(input.session_id, this.now()) : null
    if (!user) throw new InvalidCredentialsError()
    const email = assertEmail(input.email)
    if (input.idempotency_key && !(await this.repository.claimIdempotency(`email-claim:${user.id}`, input.idempotency_key))) return PENDING
    if (user.email_verified) return PENDING
    const uid = await this.repository.findUidForUser(user.id)
    if (user.email !== '' && normalizeEmail(user.email) === email) {
      if (uid) await this.bestEffort('sendEmailVerification', this.firebase.sendEmailVerification(uid))
      return PENDING
    }
    const taken = await this.repository.findByEmail(email)
    if (taken && taken.id !== user.id) return PENDING
    await this.repository.setEmail({ user_id: user.id, email })
    if (uid) await this.bestEffort('sendEmailVerification', this.firebase.sendEmailVerification(uid))
    return PENDING
  }

  async sendVerification(session_id: string | undefined): Promise<typeof OK> {
    const user = session_id ? await this.repository.findBySession(session_id, this.now()) : null
    if (user && user.email !== '') {
      const uid = await this.repository.findUidForUser(user.id)
      if (uid) await this.bestEffort('sendEmailVerification', this.firebase.sendEmailVerification(uid))
    }
    return OK
  }

  async confirmVerification(oob_code: string): Promise<typeof OK> {
    const confirmed = await this.firebase.confirmEmailVerification(oob_code)
    if (confirmed) await this.repository.markEmailVerified(confirmed.firebase_uid)
    return OK
  }

  async requestPasswordReset(email: string): Promise<typeof OK> {
    if (looksLikeEmail(email)) await this.bestEffort('sendPasswordReset', this.firebase.sendPasswordReset(normalizeEmail(email)))
    return OK
  }

  async confirmPasswordReset(input: { oob_code: string; password: string }): Promise<typeof OK> {
    assertPassword(input.password)
    const saved = await this.firebase.confirmPasswordReset(input)
    if (!saved) throw new AuthProviderError()
    return OK
  }

  async logout(session_id: string | undefined, correlation_id: string): Promise<void> {
    if (session_id) await this.repository.revokeSession(session_id, correlation_id)
  }

  async current(session_id: string | undefined): Promise<MemberSession | { status: 'guest' }> {
    if (!session_id) return { status: 'guest' }
    const user = await this.repository.findBySession(session_id, this.now())
    if (!user) return { status: 'guest' }
    return toMember(user)
  }

  async config(): Promise<Record<string, unknown>> {
    const cache = this.providers_cache
    const is_fresh = cache !== null && this.now().getTime() - cache.at < PROVIDER_CACHE_MS
    const providers = is_fresh ? cache.providers : await this.firebase.listProviders()
    this.providers_cache = { at: this.now().getTime(), providers }
    const body: Record<string, unknown> = {
      api_key: this.options.web_api_key,
      auth_domain: this.options.auth_domain,
      project_id: this.options.project_id,
      providers,
      emulator_host: this.options.emulator_host,
    }
    if (this.options.emulator_host && this.options.seed_password) {
      body.test_participants = PARTICIPANT_DEFS.map((def) => ({
        email: def.key === 'superadmin' ? this.options.superadmin_email : `${def.key.replaceAll('_', '-')}@blog.test`,
        label: def.display_name,
      }))
      body.test_password = this.options.seed_password
    }
    return body
  }

  provisionSuperadmin(email: string): Promise<{ created: boolean; user_id: string }> {
    return this.repository.provisionSuperadmin({ email, correlation_id: randomBytes(8).toString('hex') })
  }

  private newSession(): NewSession {
    const max_age_seconds = this.options.session_ttl_days * 24 * 60 * 60
    return { session_id: newSessionId(), expires_at: new Date(this.now().getTime() + this.options.session_ttl_days * DAY_MS), max_age_seconds }
  }

  private async deleteOrphan(firebase_uid: string): Promise<void> {
    const linked = await this.repository.findIdentityUserId(firebase_uid)
    if (linked) return
    await this.bestEffort('deleteUser', this.firebase.deleteUser(firebase_uid))
  }

  /** Сбой побочного действия не меняет ответ (адреса не перебираются по ошибкам), но попадает в лог. */
  private async bestEffort(operation: string, action: Promise<unknown>): Promise<void> {
    try {
      await action
    } catch (error) {
      this.logger.warn({ err: error, operation }, 'побочное действие входа не выполнено')
    }
  }
}
