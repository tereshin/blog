const OPEN_SETTINGS = { registration_open: true, new_members_can_publish: true }

export type SignInUser = {
  id: string
  email: string
  email_verified: boolean
  role: 'member' | 'admin' | 'superadmin'
  can_publish: boolean
  restricted_at: Date | null
}

export type SignInToken = {
  firebase_uid: string
  email: string | null
  email_verified: boolean
  name: string | null
}

export type SignInDecision =
  | { action: 'login'; user: SignInUser; attach_uid: boolean }
  | {
      action: 'create'
      email: string | null
      email_verified: boolean
      role: 'member'
      can_publish: boolean
      display_name: string
    }
  | { action: 'reject'; error: 'registration_closed' }

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Адрес похож на почту: есть `@`, части по сторонам не пустые, без пробелов. */
export function looksLikeEmail(value: string): boolean {
  const email = value.trim()
  const at = email.indexOf('@')
  if (at <= 0 || at !== email.lastIndexOf('@') || at === email.length - 1) return false
  if (email.includes(' ') || email.includes('\t')) return false
  return true
}

/** Имя профиля: имя поставщика, иначе часть адреса до `@`. Не длиннее 50 символов. */
export function displayNameFromToken(token: { email: string | null; name: string | null }): string {
  const from_name = token.name?.trim()
  const local = token.email ? normalizeEmail(token.email).split('@')[0] ?? '' : ''
  const raw = from_name && from_name.length > 0 ? from_name : local
  const trimmed = raw.slice(0, 50).trim()
  return trimmed.length > 0 ? trimmed : 'Участник'
}

export function displayNameFromEmail(email: string): string {
  return displayNameFromToken({ email, name: null })
}

/**
 * Решает вход по ID-токену до любой записи.
 * Регистрация почтой сюда не входит: у неё нет уже известного uid.
 */
export function decideSignIn(input: {
  token: SignInToken
  by_uid: SignInUser | null
  by_email: SignInUser | null
  settings?: { registration_open: boolean; new_members_can_publish: boolean }
}): SignInDecision {
  const settings = input.settings ?? OPEN_SETTINGS
  const { by_uid, by_email, token } = input

  if (by_uid) return { action: 'login', user: by_uid, attach_uid: false }

  if (token.email_verified && by_email) return { action: 'login', user: by_email, attach_uid: true }

  if (!settings.registration_open) return { action: 'reject', error: 'registration_closed' }

  if (token.email_verified && token.email) {
    return {
      action: 'create',
      email: normalizeEmail(token.email),
      email_verified: true,
      role: 'member',
      can_publish: settings.new_members_can_publish,
      display_name: displayNameFromToken(token),
    }
  }

  return {
    action: 'create',
    email: null,
    email_verified: false,
    role: 'member',
    can_publish: settings.new_members_can_publish,
    display_name: displayNameFromToken(token),
  }
}

function hasControlChar(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) <= 31) return true
  }
  return false
}

/** Только относительный путь этого origin: `//host` и схемы отбрасываются. */
export function sanitizeReturnTo(value: string | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || hasControlChar(value)) return '/'
  return value.slice(0, 512)
}
