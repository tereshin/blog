import type { AccountDecision, AccountSettings, AccountUser, GoogleClaims } from './auth.types.ts'

const OPEN_SETTINGS: AccountSettings = { registration_open: true, new_members_can_publish: true }

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Имя профиля: имя у издателя, иначе часть почты до `@`. Не длиннее 50 символов. */
export function displayNameFromClaims(claims: GoogleClaims): string {
  const from_name = claims.name?.trim()
  const local = normalizeEmail(claims.email).split('@')[0] ?? ''
  const raw = from_name && from_name.length > 0 ? from_name : local
  const trimmed = raw.slice(0, 50).trim()
  return trimmed.length > 0 ? trimmed : 'Участник'
}

export function hintFromEmail(email: string): string {
  return displayNameFromClaims({ sub: '', email, email_verified: true, name: null })
}

/**
 * Решает, что делать с подтверждённым `id_token`, не трогая базу.
 * Почта суперадминистратора входит даже при закрытой регистрации.
 * Привязка `sub` к строке без `google_sub` — только при `email_verified`.
 */
export function decideAccount(input: {
  claims: GoogleClaims
  by_sub: AccountUser | null
  by_email: AccountUser | null
  settings?: AccountSettings
  superadmin_email: string
}): AccountDecision {
  const settings = input.settings ?? OPEN_SETTINGS
  const email = normalizeEmail(input.claims.email)
  const is_super = email === normalizeEmail(input.superadmin_email)
  const { by_sub, by_email, claims } = input

  if (by_sub) {
    if (by_sub.restricted_at) return { action: 'reject', error: 'restricted' }
    const taken_by_other = by_email !== null && by_email.id !== by_sub.id
    const next_email = claims.email_verified && email !== normalizeEmail(by_sub.email) && !taken_by_other ? email : null
    return { action: 'login', user: by_sub, next_email }
  }

  if (by_email?.google_sub && by_email.google_sub !== claims.sub) return { action: 'reject', error: 'email_taken' }

  if (is_super && by_email && !by_email.google_sub) {
    if (!claims.email_verified) return { action: 'reject', error: 'email_unverified' }
    if (by_email.restricted_at) return { action: 'reject', error: 'restricted' }
    return { action: 'bind', user: by_email }
  }

  if (is_super) {
    if (!claims.email_verified) return { action: 'reject', error: 'email_unverified' }
    return { action: 'create', role: 'superadmin', can_publish: true }
  }

  if (!settings.registration_open) return { action: 'reject', error: 'registration_closed' }
  if (!claims.email_verified) return { action: 'reject', error: 'email_unverified' }
  if (by_email) return { action: 'reject', error: 'email_taken' }
  return { action: 'create', role: 'member', can_publish: settings.new_members_can_publish }
}

/** Только относительный путь этого origin: `//host` и схемы отбрасываются. */
export function sanitizeReturnTo(value: string | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || /[\u0000-\u001f]/.test(value)) return '/'
  return value.slice(0, 512)
}
