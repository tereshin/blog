import type { AuthCallbackError } from '@blog/contracts'

export type AccountRole = 'member' | 'admin' | 'superadmin'

export type AccountUser = {
  id: string
  email: string
  google_sub: string | null
  role: AccountRole
  can_publish: boolean
  restricted_at: Date | null
  public_number: number
  appearance: 'light' | 'dark' | null
  created_at: Date
}

export type AccountSettings = {
  registration_open: boolean
  new_members_can_publish: boolean
}

export type GoogleClaims = {
  sub: string
  email: string
  email_verified: boolean
  name: string | null
}

export type AccountDecision =
  | { action: 'reject'; error: AuthCallbackError['error'] }
  | { action: 'login'; user: AccountUser; next_email: string | null }
  | { action: 'bind'; user: AccountUser }
  | { action: 'create'; role: 'member' | 'superadmin'; can_publish: boolean }

export type AuthResult =
  | { ok: true; session_id: string; return_to: string; max_age_seconds: number }
  | { ok: false; error: AuthCallbackError['error']; return_to: string }

export type MemberSession = {
  status: 'member'
  user: {
    id: string
    public_number: number
    role: AccountRole
    can_publish: boolean
    is_restricted: boolean
    appearance: 'light' | 'dark' | null
  }
  display_name_hint: string
}

export type GoogleBegin = {
  redirect_to: URL
  state: string
  nonce: string
  code_verifier: string
}

export type GoogleClient = {
  begin: () => Promise<GoogleBegin>
  exchange: (input: { callback_url: URL; code_verifier: string; expected_state: string; expected_nonce: string }) => Promise<GoogleClaims>
}

export type AuthRepository = {
  saveState: (row: { state: string; code_verifier: string; nonce: string; return_to: string }) => Promise<void>
  takeState: (state: string) => Promise<{ code_verifier: string; nonce: string; return_to: string } | null>
  readSettings: () => Promise<AccountSettings>
  findBySub: (sub: string) => Promise<AccountUser | null>
  findByEmail: (email: string) => Promise<AccountUser | null>
  findBySession: (session_id: string, now: Date) => Promise<AccountUser | null>
  loginExisting: (input: { user: AccountUser; next_email: string | null; session_id: string; expires_at: Date; correlation_id: string }) => Promise<void>
  bindSuperadmin: (input: {
    user: AccountUser
    google_sub: string
    display_name: string
    session_id: string
    expires_at: Date
    correlation_id: string
  }) => Promise<AccountUser>
  createUser: (input: {
    claims: GoogleClaims
    display_name: string
    role: 'member' | 'superadmin'
    can_publish: boolean
    session_id: string
    expires_at: Date
    correlation_id: string
  }) => Promise<AccountUser>
  revokeSession: (session_id: string, correlation_id: string) => Promise<void>
  /** Учётная запись суперадминистратора без `google_sub` и без сессии. Повтор не создаёт вторую строку. */
  provisionSuperadmin: (input: { email: string; correlation_id: string }) => Promise<{ created: boolean; user_id: string }>
}
