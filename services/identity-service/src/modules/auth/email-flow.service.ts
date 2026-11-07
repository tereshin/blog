import { randomUUID } from 'node:crypto'
import { ForbiddenError } from '@blog/errors'
import type { EmailCodeStep, EmailFlowBody, EmailFlowResponse } from '@blog/contracts'
import type { Logger } from '@blog/logger'
import { AuthService } from './auth.service.ts'
import { AuthFieldError, FirebaseEmailExistsError, RegistrationClosedError } from './auth.errors.ts'
import { displayNameFromEmail, looksLikeEmail, normalizeEmail } from './auth.policy.ts'
import { EmailFlowError } from './email-flow.errors.ts'
import { EmailCodeCrypto } from './email-code-crypto.ts'
import type { EmailFlow, EmailFlowRepositoryPort, EmailFlowStore } from './email-flow.types.ts'
import type { AuthServiceOptions, FirebaseGateway } from './auth.types.ts'

const CODE_TTL_MS = 10 * 60_000
const PASSWORD_TTL_MS = 5 * 60_000
const RESEND_MS = 60_000

function assertActive(flow: EmailFlow, now: Date): void {
  if (flow.consumed_at) throw new EmailFlowError('flow_expired')
  if (flow.attempts >= 5) throw new EmailFlowError('code_attempts_exhausted')
  if (flow.expires_at <= now) throw new EmailFlowError('code_expired')
}

export class EmailFlowService {
  private readonly now: () => Date

  constructor(
    private readonly repository: EmailFlowRepositoryPort,
    private readonly firebase: FirebaseGateway,
    private readonly crypto: EmailCodeCrypto,
    private readonly logger: Pick<Logger, 'warn'>,
    private readonly auth_options: AuthServiceOptions,
  ) {
    this.now = auth_options.now ?? (() => new Date())
  }

  private step(flow: EmailFlow): EmailCodeStep {
    return {
      step: 'code', flow_id: flow.id, purpose: flow.purpose, server_time: this.now().toISOString(),
      expires_at: flow.expires_at.toISOString(), resend_at: flow.resend_at.toISOString(),
    }
  }

  private async send(flow: EmailFlow, store: EmailFlowStore): Promise<EmailCodeStep> {
    const now = this.now()
    const code = this.crypto.generate()
    flow.code_hash = this.crypto.hash(flow.id, flow.email, flow.purpose, code)
    flow.attempts = 0
    flow.expires_at = new Date(now.getTime() + CODE_TTL_MS)
    flow.resend_at = new Date(now.getTime() + RESEND_MS)
    flow.verified_until = null
    await store.save(flow)
    await store.enqueue(flow, this.crypto.encrypt({ email: flow.email, code, purpose: flow.purpose }))
    return this.step(flow)
  }

  async start(input: EmailFlowBody): Promise<EmailFlowResponse> {
    if (!looksLikeEmail(input.email)) throw new AuthFieldError('email', 'Адрес не похож на почту')
    const email = normalizeEmail(input.email)
    return this.repository.withEmail(email, async (store) => {
      const user = await store.auth.findByEmail(email)
      if (user?.restricted_at) throw new ForbiddenError()
      if (user && input.purpose === 'continue') return { step: 'password' }
      const purpose = input.purpose === 'continue' ? 'registration' : 'password_reset'
      if (purpose === 'registration' && !(await store.auth.readSettings()).registration_open) throw new RegistrationClosedError()
      const now = this.now()
      const latest = await store.latest()
      if (latest && latest.resend_at > now) {
        // Never reveal another browser's flow capability by submitting its email again.
        throw new EmailFlowError('code_cooldown')
      }
      await store.invalidate(now)
      const flow: EmailFlow = {
        id: randomUUID(), email, purpose, user_id: user?.id ?? null, code_hash: '', attempts: 0,
        expires_at: now, resend_at: now, verified_until: null, consumed_at: null, created_at: now,
      }
      // Unknown reset addresses receive the same response but no mail or usable grant.
      if (purpose === 'password_reset' && !user) {
        flow.consumed_at = now
        flow.expires_at = new Date(now.getTime() + CODE_TTL_MS)
        flow.resend_at = new Date(now.getTime() + RESEND_MS)
        await store.save(flow)
        return this.step(flow)
      }
      return this.send(flow, store)
    })
  }

  resend(flow_id: string): Promise<EmailCodeStep> {
    return this.repository.withFlow(flow_id, async (flow, store) => {
      const now = this.now()
      assertActive(flow, now)
      if (flow.verified_until) throw new EmailFlowError('flow_expired')
      if (flow.resend_at > now) throw new EmailFlowError('code_cooldown')
      return this.send(flow, store)
    })
  }

  async confirm(flow_id: string, code: string): Promise<{ step: 'password_setup' }> {
    // A wrong attempt must commit before the HTTP error is raised.
    const error = await this.repository.withFlow(flow_id, async (flow, store) => {
      const now = this.now()
      assertActive(flow, now)
      if (flow.verified_until) throw new EmailFlowError('flow_expired')
      if (!this.crypto.matches(flow, code)) {
        flow.attempts += 1
        await store.save(flow)
        return flow.attempts >= 5 ? 'code_attempts_exhausted' as const : 'invalid_code' as const
      }
      flow.verified_until = new Date(now.getTime() + PASSWORD_TTL_MS)
      await store.save(flow)
      return null
    })
    if (error) throw new EmailFlowError(error)
    return { step: 'password_setup' }
  }

  async complete(flow_id: string, password: string, correlation_id: string): Promise<{ session_id: string; max_age_seconds: number }> {
    if (password.length < 8 || password.length > 1024) throw new AuthFieldError('password', 'Пароль должен содержать от 8 до 1024 символов')
    let created_uid: string | null = null
    let created_email = ''
    try {
      return await this.repository.withFlow(flow_id, async (flow, store) => {
        const now = this.now()
        if (flow.consumed_at || !flow.verified_until || flow.verified_until <= now) throw new EmailFlowError('flow_expired')
        const user = await store.auth.findByEmail(flow.email)
        if (user?.restricted_at) throw new ForbiddenError()
        const settings = await store.auth.readSettings()
        if (flow.purpose === 'registration') {
          if (!settings.registration_open) throw new RegistrationClosedError()
          if (user) throw new EmailFlowError('account_changed')
        } else if (!user || user.id !== flow.user_id) throw new EmailFlowError('account_changed')

        let firebase_uid: string
        if (flow.purpose === 'registration') {
          const created = await this.firebase.createVerifiedUser({ email: flow.email, password })
          firebase_uid = created_uid = created.firebase_uid
          created_email = flow.email
          await store.auth.createMember({
            email: flow.email, email_verified: true, firebase_uid, provider_id: 'password', role: 'member',
            can_publish: settings.new_members_can_publish, display_name: displayNameFromEmail(flow.email),
            session_id: null, expires_at: null, correlation_id,
          })
        } else {
          if (!user) throw new EmailFlowError('account_changed')
          const existing_uid = await this.firebase.findUidByEmail(flow.email)
          const owner = existing_uid ? await store.auth.findIdentityUserId(existing_uid) : null
          if (owner && owner !== user.id) throw new EmailFlowError('account_changed')
          if (existing_uid) {
            firebase_uid = existing_uid
            await this.firebase.setVerifiedPassword({ firebase_uid, email: flow.email, password })
          } else {
            const created = await this.firebase.createVerifiedUser({ email: flow.email, password })
            firebase_uid = created_uid = created.firebase_uid
            created_email = flow.email
          }
          if (!owner) await store.auth.attachUid({ user_id: user.id, firebase_uid, provider_id: 'password', email_verified: true })
          else await store.auth.markEmailVerified(firebase_uid)
          await store.revokeSessions(user.id, correlation_id, now)
        }
        const auth = new AuthService(store.auth, this.firebase, this.logger, this.auth_options)
        const session = await auth.signIn({ body: { method: 'password', email: flow.email, password }, correlation_id })
        flow.consumed_at = now
        await store.save(flow)
        return session
      })
    } catch (error) {
      if (created_uid) {
        const orphan_uid = created_uid
        try {
          await this.repository.withEmail(created_email, async (store) => {
            if (!(await store.auth.findIdentityUserId(orphan_uid))) await this.firebase.deleteUser(orphan_uid)
          })
        }
        catch { this.logger.warn({ operation: 'deleteEmailFlowOrphan' }, 'Не удалось удалить незавершённую регистрацию Firebase') }
      }
      if (error instanceof FirebaseEmailExistsError) throw new EmailFlowError('account_changed')
      throw error
    }
  }
}
