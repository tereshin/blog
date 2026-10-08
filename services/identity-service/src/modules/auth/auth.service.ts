import { randomBytes } from 'node:crypto'
import { AuthProviderError } from './auth.errors.ts'
import { decideAccount, displayNameFromClaims, hintFromEmail, sanitizeReturnTo } from './auth.policy.ts'
import type { AuthRepository, AuthResult, GoogleClient, MemberSession } from './auth.types.ts'

const DAY_MS = 24 * 60 * 60 * 1000

function newSessionId(): string {
  return randomBytes(18).toString('base64url')
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === '23505'
}

export type AuthService = {
  start: (return_to: string | undefined) => Promise<URL>
  complete: (search: string, correlation_id: string) => Promise<AuthResult>
  logout: (session_id: string | undefined, correlation_id: string) => Promise<void>
  current: (session_id: string | undefined) => Promise<MemberSession | { status: 'guest' }>
}

export function createAuthService(deps: {
  repository: AuthRepository
  google: GoogleClient
  redirect_uri: string
  superadmin_email: string
  session_ttl_days: number
  now?: () => Date
}): AuthService {
  const now = deps.now ?? (() => new Date())

  return {
    async start(return_to) {
      const begun = await deps.google.begin()
      await deps.repository.saveState({
        state: begun.state,
        code_verifier: begun.code_verifier,
        nonce: begun.nonce,
        return_to: sanitizeReturnTo(return_to),
      })
      return begun.redirect_to
    },

    async complete(search, correlation_id) {
      const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
      const state = params.get('state') ?? ''
      const stored = state ? await deps.repository.takeState(state) : null
      if (!stored) throw new AuthProviderError()
      const return_to = sanitizeReturnTo(stored.return_to)

      const callback_url = new URL(deps.redirect_uri)
      callback_url.search = search.startsWith('?') ? search : `?${search}`
      const claims = await deps.google.exchange({
        callback_url,
        code_verifier: stored.code_verifier,
        expected_state: state,
        expected_nonce: stored.nonce,
      })

      const [by_sub, by_email, settings] = await Promise.all([
        deps.repository.findBySub(claims.sub),
        deps.repository.findByEmail(claims.email),
        deps.repository.readSettings(),
      ])
      const decision = decideAccount({ claims, by_sub, by_email, settings, superadmin_email: deps.superadmin_email })
      if (decision.action === 'reject') return { ok: false, error: decision.error, return_to }

      const session_id = newSessionId()
      const expires_at = new Date(now().getTime() + deps.session_ttl_days * DAY_MS)
      try {
        if (decision.action === 'login') {
          await deps.repository.loginExisting({ user: decision.user, next_email: decision.next_email, session_id, expires_at, correlation_id })
        } else if (decision.action === 'bind') {
          await deps.repository.bindSuperadmin({
            user: decision.user,
            google_sub: claims.sub,
            display_name: displayNameFromClaims(claims),
            session_id,
            expires_at,
            correlation_id,
          })
        } else {
          await deps.repository.createUser({
            claims,
            display_name: displayNameFromClaims(claims),
            role: decision.role,
            can_publish: decision.can_publish,
            session_id,
            expires_at,
            correlation_id,
          })
        }
      } catch (error) {
        if (!isUniqueViolation(error)) throw error
        const existing = await deps.repository.findBySub(claims.sub)
        if (!existing || existing.restricted_at) return { ok: false, error: existing ? 'restricted' : 'email_taken', return_to }
        await deps.repository.loginExisting({ user: existing, next_email: null, session_id, expires_at, correlation_id })
      }
      return { ok: true, session_id, return_to, max_age_seconds: deps.session_ttl_days * 24 * 60 * 60 }
    },

    async logout(session_id, correlation_id) {
      if (!session_id) return
      await deps.repository.revokeSession(session_id, correlation_id)
    },

    async current(session_id) {
      if (!session_id) return { status: 'guest' }
      const user = await deps.repository.findBySession(session_id, now())
      if (!user) return { status: 'guest' }
      return {
        status: 'member',
        user: {
          id: user.id,
          public_number: user.public_number,
          role: user.role,
          can_publish: user.can_publish,
          is_restricted: user.restricted_at !== null,
          appearance: user.appearance,
        },
        display_name_hint: hintFromEmail(user.email),
      }
    },
  }
}
