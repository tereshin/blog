import { randomBytes, timingSafeEqual } from 'node:crypto'
import type { FastifyReply } from 'fastify'

export type CookieNames = {
  session: string
  guest: string
  csrf: string
}

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60

export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString('base64url')
}

/** `HttpOnly; Secure; SameSite=Lax; Path=/` — cookie сессии ставит только gateway. */
export function setSessionCookie(reply: FastifyReply, names: CookieNames, session_id: string, max_age_seconds?: number): void {
  void reply.setCookie(names.session, session_id, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    ...(max_age_seconds ? { maxAge: max_age_seconds } : {}),
  })
}

export function clearSessionCookie(reply: FastifyReply, names: CookieNames): void {
  void reply.clearCookie(names.session, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' })
}

export function setGuestCookie(reply: FastifyReply, names: CookieNames, guest_id: string): void {
  void reply.setCookie(names.guest, guest_id, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
  })
}

/** CSRF-cookie читается клиентом (не HttpOnly) и возвращается в `X-CSRF-Token`. */
export function setCsrfCookie(reply: FastifyReply, names: CookieNames, token: string): void {
  void reply.setCookie(names.csrf, token, { httpOnly: false, secure: true, sameSite: 'lax', path: '/' })
}

export const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/** Double-submit: заголовок обязан совпасть с cookie. Сравнение — за постоянное время. */
export function isCsrfValid(cookie_value: string | undefined, header_value: string | string[] | undefined): boolean {
  if (!cookie_value || typeof header_value !== 'string') return false
  const a = Buffer.from(cookie_value)
  const b = Buffer.from(header_value)
  return a.length === b.length && timingSafeEqual(a, b)
}
