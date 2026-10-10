import { randomBytes } from 'node:crypto'
import { PARTICIPANT_DEFS } from '@blog/seed-data'
import { AuthFieldError, AuthProviderError, InvalidCredentialsError, RegistrationClosedError } from './auth.errors.ts'
import { FirebaseEmailExistsError } from './firebase-admin.ts'
import type { FirebaseGateway } from './firebase-admin.ts'
import { decideSignIn, displayNameFromEmail, looksLikeEmail, normalizeEmail } from './auth.policy.ts'
import { isUniqueViolation } from './auth.repository.ts'
import type { AccountUser, AuthRepository, MemberSession } from './auth.types.ts'

const DAY_MS = 24 * 60 * 60 * 1000
const MIN_PASSWORD = 8
const PROVIDER_CACHE_MS = 60_000

const PENDING = { status: 'pending' as const }
const OK = { status: 'ok' as const }

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

export type AuthService = {
  register: (input: { email: string; password: string; display_name?: string; idempotency_key: string | null; correlation_id: string }) => Promise<typeof PENDING>
  signIn: (input: {
    body: { method: 'password'; email: string; password: string } | { method: 'id_token'; id_token: string }
    correlation_id: string
  }) => Promise<{ session_id: string; max_age_seconds: number }>
  claimEmail: (input: { session_id: string | undefined; email: string; idempotency_key: string | null }) => Promise<typeof PENDING>
  sendVerification: (session_id: string | undefined) => Promise<typeof OK>
  confirmVerification: (oob_code: string) => Promise<typeof OK>
  requestPasswordReset: (email: string) => Promise<typeof OK>
  confirmPasswordReset: (input: { oob_code: string; password: string }) => Promise<typeof OK>
  logout: (session_id: string | undefined, correlation_id: string) => Promise<void>
  current: (session_id: string | undefined) => Promise<MemberSession | { status: 'guest' }>
  config: () => Promise<Record<string, unknown>>
  provisionSuperadmin: (email: string) => Promise<{ created: boolean; user_id: string }>
}

export function createAuthService(deps: {
  repository: AuthRepository
  firebase: FirebaseGateway
  superadmin_email: string
  session_ttl_days: number
  web_api_key: string
  auth_domain: string
  project_id: string
  emulator_host: string | null
  seed_password: string | null
  now?: () => Date
}): AuthService {
  const now = deps.now ?? (() => new Date())
  let providers_cache: { at: number; providers: { id: string }[] } | null = null

  function expiresAt(): { session_id: string; expires_at: Date; max_age_seconds: number } {
    const max_age_seconds = deps.session_ttl_days * 24 * 60 * 60
    return { session_id: newSessionId(), expires_at: new Date(now().getTime() + deps.session_ttl_days * DAY_MS), max_age_seconds }
  }

  async function deleteOrphan(firebase_uid: string): Promise<void> {
    const linked = await deps.repository.findIdentityUserId(firebase_uid)
    if (linked) return
    await deps.firebase.deleteUser(firebase_uid).catch(() => undefined)
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

  return {
    async register(input) {
      const email = assertEmail(input.email)
      assertPassword(input.password)
      if (input.idempotency_key && !(await deps.repository.claimIdempotency('registration', input.idempotency_key))) return PENDING

      const settings = await deps.repository.readSettings()
      if (!settings.registration_open) throw new RegistrationClosedError()

      const taken = await deps.repository.findByEmail(email)
      if (taken) return PENDING

      let firebase_uid: string
      try {
        const created = await deps.firebase.createUser({ email, password: input.password })
        firebase_uid = created.firebase_uid
      } catch (error) {
        if (error instanceof FirebaseEmailExistsError) return PENDING
        throw error
      }

      try {
        await deps.repository.createMember({
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
        if (!isUniqueViolation(error)) throw error
        await deleteOrphan(firebase_uid)
        return PENDING
      }
      await deps.firebase.sendEmailVerification(firebase_uid).catch(() => undefined)
      return PENDING
    },

    async signIn(input) {
      if (input.body.method === 'password') {
        if (!looksLikeEmail(input.body.email)) throw new InvalidCredentialsError()
        const email = normalizeEmail(input.body.email)
        const token = await deps.firebase.signInWithPassword({ email, password: input.body.password })
        const user = token ? await deps.repository.findByEmail(email) : null
        if (!token || !user) throw new InvalidCredentialsError()
        const session = expiresAt()
        await deps.repository.openSession({ user_id: user.id, session_id: session.session_id, expires_at: session.expires_at })
        return { session_id: session.session_id, max_age_seconds: session.max_age_seconds }
      }

      let token
      try {
        token = await deps.firebase.verifyIdToken(input.body.id_token)
      } catch (error) {
        throw new AuthProviderError(error)
      }
      const [by_uid, by_email, settings] = await Promise.all([
        deps.repository.findByUid(token.firebase_uid),
        token.email_verified && token.email ? deps.repository.findByEmail(token.email) : Promise.resolve(null),
        deps.repository.readSettings(),
      ])
      const decision = decideSignIn({ token, by_uid, by_email, settings })
      if (decision.action === 'reject') {
        await deleteOrphan(token.firebase_uid)
        throw new RegistrationClosedError()
      }
      const session = expiresAt()
      try {
        if (decision.action === 'login') {
          if (decision.attach_uid) {
            await deps.repository.attachUid({
              user_id: decision.user.id,
              firebase_uid: token.firebase_uid,
              provider_id: token.provider_id,
              email_verified: token.email_verified,
            })
          }
          await deps.repository.openSession({ user_id: decision.user.id, session_id: session.session_id, expires_at: session.expires_at })
        } else {
          await deps.repository.createMember({
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
        if (!isUniqueViolation(error) || !token.email) throw error
        const winner = await deps.repository.findByEmail(token.email)
        if (!winner) throw error
        await deps.repository.attachUid({
          user_id: winner.id,
          firebase_uid: token.firebase_uid,
          provider_id: token.provider_id,
          email_verified: true,
        }).catch(() => undefined)
        await deps.repository.openSession({ user_id: winner.id, session_id: session.session_id, expires_at: session.expires_at })
      }
      return { session_id: session.session_id, max_age_seconds: session.max_age_seconds }
    },

    async claimEmail(input) {
      const user = input.session_id ? await deps.repository.findBySession(input.session_id, now()) : null
      if (!user) throw new InvalidCredentialsError()
      const email = assertEmail(input.email)
      if (input.idempotency_key && !(await deps.repository.claimIdempotency(`email-claim:${user.id}`, input.idempotency_key))) return PENDING
      if (user.email_verified) return PENDING
      const uid = await deps.repository.findUidForUser(user.id)
      if (user.email !== '' && normalizeEmail(user.email) === email) {
        if (uid) await deps.firebase.sendEmailVerification(uid).catch(() => undefined)
        return PENDING
      }
      const taken = await deps.repository.findByEmail(email)
      if (taken && taken.id !== user.id) return PENDING
      await deps.repository.setEmail({ user_id: user.id, email })
      if (uid) await deps.firebase.sendEmailVerification(uid).catch(() => undefined)
      return PENDING
    },

    async sendVerification(session_id) {
      const user = session_id ? await deps.repository.findBySession(session_id, now()) : null
      if (user && user.email !== '') {
        const uid = await deps.repository.findUidForUser(user.id)
        if (uid) await deps.firebase.sendEmailVerification(uid).catch(() => undefined)
      }
      return OK
    },

    async confirmVerification(oob_code) {
      const confirmed = await deps.firebase.confirmEmailVerification(oob_code)
      if (confirmed) await deps.repository.markEmailVerified(confirmed.firebase_uid)
      return OK
    },

    async requestPasswordReset(email) {
      if (looksLikeEmail(email)) await deps.firebase.sendPasswordReset(normalizeEmail(email)).catch(() => undefined)
      return OK
    },

    async confirmPasswordReset(input) {
      assertPassword(input.password)
      const saved = await deps.firebase.confirmPasswordReset(input)
      if (!saved) throw new AuthProviderError()
      return OK
    },

    async logout(session_id, correlation_id) {
      if (session_id) await deps.repository.revokeSession(session_id, correlation_id)
    },

    async current(session_id) {
      if (!session_id) return { status: 'guest' }
      const user = await deps.repository.findBySession(session_id, now())
      if (!user) return { status: 'guest' }
      return toMember(user)
    },

    async config() {
      const fresh = providers_cache && now().getTime() - providers_cache.at < PROVIDER_CACHE_MS
      const providers = fresh && providers_cache ? providers_cache.providers : await deps.firebase.listProviders()
      providers_cache = { at: now().getTime(), providers }
      const body: Record<string, unknown> = {
        api_key: deps.web_api_key,
        auth_domain: deps.auth_domain,
        project_id: deps.project_id,
        providers,
        emulator_host: deps.emulator_host,
      }
      if (deps.emulator_host && deps.seed_password) {
        body.test_participants = PARTICIPANT_DEFS.map((def) => ({
          email: def.key === 'superadmin' ? deps.superadmin_email : `${def.key.replaceAll('_', '-')}@blog.test`,
          label: def.display_name,
        }))
        body.test_password = deps.seed_password
      }
      return body
    },

    provisionSuperadmin(email) {
      return deps.repository.provisionSuperadmin({ email, correlation_id: randomBytes(8).toString('hex') })
    },
  }
}
