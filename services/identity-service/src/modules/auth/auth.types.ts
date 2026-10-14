import type { SignInUser } from './auth.policy.ts'

export type AccountRole = 'member' | 'admin' | 'superadmin'

export type AccountUser = SignInUser & {
  public_number: number
  appearance: 'light' | 'dark' | null
  created_at: Date
}

export type AccountSettings = {
  registration_open: boolean
  new_members_can_publish: boolean
}

export type MemberSession = {
  status: 'member'
  user: {
    id: string
    public_number: number
    role: AccountRole
    can_publish: boolean
    is_restricted: boolean
    appearance: 'light' | 'dark' | null
    email: string | null
    email_verified: boolean
  }
  display_name_hint: string
}

/**
 * Порт хранилища учётных записей. `openSession`, `attachUid` и `createMember` при гонке
 * уникального индекса бросают `AccountConflictError`.
 */
export type AuthRepositoryPort = {
  readSettings: () => Promise<AccountSettings>
  findByUid: (firebase_uid: string) => Promise<AccountUser | null>
  findByEmail: (email: string) => Promise<AccountUser | null>
  findIdentityUserId: (firebase_uid: string) => Promise<string | null>
  findUidForUser: (user_id: string) => Promise<string | null>
  findBySession: (session_id: string, now: Date) => Promise<AccountUser | null>
  openSession: (input: { user_id: string; session_id: string; expires_at: Date }) => Promise<void>
  attachUid: (input: { user_id: string; firebase_uid: string; provider_id: string; email_verified: boolean }) => Promise<void>
  createMember: (input: {
    email: string
    email_verified: boolean
    firebase_uid: string
    provider_id: string
    role: AccountRole
    can_publish: boolean
    display_name: string
    session_id: string | null
    expires_at: Date | null
    correlation_id: string
  }) => Promise<AccountUser>
  setEmail: (input: { user_id: string; email: string }) => Promise<void>
  markEmailVerified: (firebase_uid: string) => Promise<boolean>
  claimIdempotency: (scope: string, key: string) => Promise<boolean>
  revokeSession: (session_id: string, correlation_id: string) => Promise<void>
  provisionSuperadmin: (input: { email: string; correlation_id: string }) => Promise<{ created: boolean; user_id: string }>
}

export type VerifiedToken = {
  firebase_uid: string
  email: string | null
  email_verified: boolean
  name: string | null
  provider_id: string
}

/** Порт Firebase Admin и Identity Toolkit. `createUser` на занятый адрес бросает `FirebaseEmailExistsError`. */
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
  close: () => Promise<void>
}

/** Параметры входа из окружения; подставляет app.ts. */
export type AuthServiceOptions = {
  superadmin_email: string
  session_ttl_days: number
  web_api_key: string
  auth_domain: string
  project_id: string
  emulator_host: string | null
  seed_password: string | null
  now?: () => Date
}
