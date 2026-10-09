import { randomBytes } from 'node:crypto'

/** Сервисы встраивания из редактора. Другие frame-src не разрешены, кроме окна входа. */
export const EMBED_FRAME_ORIGINS = [
  'https://www.youtube.com',
  'https://www.youtube-nocookie.com',
  'https://player.vimeo.com',
  'https://platform.twitter.com',
  'https://github.com',
  'https://codepen.io',
] as const

/** Хосты, с которыми говорит SDK Firebase Auth. Произвольный `https:` сюда не входит. */
export const FIREBASE_CONNECT_ORIGINS = [
  'https://identitytoolkit.googleapis.com',
  'https://securetoken.googleapis.com',
] as const

export const GOOGLE_ACCOUNTS_ORIGIN = 'https://accounts.google.com'

/** Origin домена обработчика Firebase (`auth_domain` без схемы → `https`). */
export function authDomainOrigin(auth_domain: string | null | undefined): string | null {
  if (!auth_domain) return null
  const value = auth_domain.trim()
  if (value === '') return null
  try {
    return new URL(value.includes('://') ? value : `https://${value}`).origin
  } catch {
    return null
  }
}

/** Origin эмулятора Auth (`host:port` → `http`). В prod вызывающий передаёт пусто. */
export function emulatorOrigin(emulator_host: string | null | undefined): string | null {
  if (!emulator_host) return null
  const value = emulator_host.trim().replace(/\/$/, '')
  if (value === '') return null
  try {
    return new URL(value.includes('://') ? value : `http://${value}`).origin
  } catch {
    return null
  }
}

export function imageOrigin(public_url: string | undefined): string | null {
  if (!public_url) return null
  try {
    return new URL(public_url).origin
  } catch {
    return null
  }
}

/** CSP для HTML, который отдаёт gateway. Без `unsafe-inline` и `unsafe-eval`. */
export function contentSecurityPolicy(input: {
  nonce: string
  image_origin: string | null
  auth_domain?: string | null
  emulator_host?: string | null
}): string {
  const images = ["'self'", 'data:', ...(input.image_origin ? [input.image_origin] : [])]
  const emulator = emulatorOrigin(input.emulator_host)
  const auth_origin = authDomainOrigin(input.auth_domain)
  const connect = ["'self'", ...FIREBASE_CONNECT_ORIGINS, ...(emulator ? [emulator] : [])]
  const frames = [...EMBED_FRAME_ORIGINS, GOOGLE_ACCOUNTS_ORIGIN, ...(auth_origin ? [auth_origin] : []), ...(emulator ? [emulator] : [])]
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${input.nonce}'`,
    "style-src 'self'",
    `img-src ${images.join(' ')}`,
    `connect-src ${connect.join(' ')}`,
    `frame-src ${frames.join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ]
  return directives.join('; ')
}

export function newCspNonce(): string {
  return randomBytes(16).toString('base64')
}
