import { randomBytes } from 'node:crypto'

/** Сервисы встраивания из редактора. Другие frame-src не разрешены. */
export const EMBED_FRAME_ORIGINS = [
  'https://www.youtube.com',
  'https://www.youtube-nocookie.com',
  'https://player.vimeo.com',
  'https://platform.twitter.com',
  'https://github.com',
  'https://codepen.io',
] as const

export function imageOrigin(public_url: string | undefined): string | null {
  if (!public_url) return null
  try {
    return new URL(public_url).origin
  } catch {
    return null
  }
}

/** CSP для HTML, который отдаёт gateway. Без `unsafe-inline` и `unsafe-eval`. */
export function contentSecurityPolicy(input: { nonce: string; image_origin: string | null }): string {
  const images = ["'self'", 'data:', ...(input.image_origin ? [input.image_origin] : [])]
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${input.nonce}'`,
    "style-src 'self'",
    `img-src ${images.join(' ')}`,
    `frame-src ${EMBED_FRAME_ORIGINS.join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ]
  return directives.join('; ')
}

export function newCspNonce(): string {
  return randomBytes(16).toString('base64')
}
