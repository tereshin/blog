import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { ForbiddenError } from '@blog/errors'
import type { Logger } from '@blog/logger'
import { CSRF_HEADER } from './session.constants.ts'
import {
  UNSAFE_METHODS,
  clearSessionCookie,
  isCsrfValid,
  randomToken,
  setCsrfCookie,
  setGuestCookie,
} from './session.cookies.ts'
import type { CookieNames } from './session.cookies.ts'
import { guestContext, isValidSessionId, memberContext } from './session.service.ts'
import type { ContextSigner, SessionService } from './session.service.ts'

export type SessionPluginOptions = {
  cookies: CookieNames
  sessions: SessionService
  signer: ContextSigner
  logger: Logger
}

/**
 * На каждом запросе: CSRF-проверка небезопасных методов, cookie → сессия (кэш 30 с) → служебный контекст,
 * подпись JWT. Просроченная сессия понижается до гостя, устаревшая cookie очищается.
 */
const sessionPlugin: FastifyPluginAsync<SessionPluginOptions> = async (app, options) => {
  const { cookies, sessions, signer } = options
  app.decorateRequest('viewer_session', undefined as unknown as never) // заполняется в onRequest

  app.addHook('onRequest', async (request, reply) => {
    if (request.routeOptions.config.is_public) return

    let csrf_token = request.cookies[cookies.csrf]
    if (!csrf_token) {
      csrf_token = randomToken()
      setCsrfCookie(reply, cookies, csrf_token)
    }
    if (UNSAFE_METHODS.has(request.method) && !isCsrfValid(request.cookies[cookies.csrf], request.headers[CSRF_HEADER])) {
      throw new ForbiddenError({ message: 'CSRF-токен не совпал', details: { reason: 'csrf' } })
    }

    let guest_id = request.cookies[cookies.guest]
    if (!guest_id) {
      guest_id = randomToken(16)
      setGuestCookie(reply, cookies, guest_id)
    }

    const session_cookie = request.cookies[cookies.session]
    let context = guestContext(guest_id)
    let session_id: string | null = null
    if (session_cookie) {
      const info = isValidSessionId(session_cookie) ? await sessions.resolve(session_cookie) : null
      if (info) {
        context = memberContext(info)
        session_id = session_cookie
      } else {
        clearSessionCookie(reply, cookies)
      }
    }

    request.viewer_session = { context, session_id, service_context_jwt: await signer.sign(context) }
  })
}

export const sessionModule = fp(sessionPlugin, { name: 'gateway-session' })
