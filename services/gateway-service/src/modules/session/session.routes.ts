import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { SERVICE_CONTEXT_HEADER, profileSchema, sessionResponseSchema, sessionUserSchema } from '@blog/contracts'
import { CORRELATION_ID_HEADER, IDEMPOTENCY_KEY_HEADER, REQUEST_ID_HEADER } from '@blog/http-kit'
import type { ProxyService } from '../proxy/index.ts'
import { resolveRoute } from '../proxy/route-table.ts'
import { clearSessionCookie, setSessionCookie } from './session.cookies.ts'
import type { CookieNames } from './session.cookies.ts'
import { SET_SESSION_MAX_AGE_HEADER } from './session.constants.ts'
import type { SessionService } from './session.service.ts'

export type AuthGatewayOptions = {
  proxy: ProxyService
  cookies: CookieNames
  sessions: SessionService
}

const identityMemberSchema = z.object({
  status: z.literal('member'),
  user: sessionUserSchema,
  display_name_hint: z.string(),
})

const callbackBodySchema = z.union([
  z.object({ session_id: z.string().min(16), return_to: z.string() }),
  z.object({ error: z.string(), return_to: z.string().optional() }),
])

function hasControlChar(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) <= 31) return true
  }
  return false
}

/** Только относительный путь: чужой origin и `//host` ведут на главную. */
export function safeReturnTo(value: string | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || hasControlChar(value)) return '/'
  return value
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

async function readJson(body: { text: () => Promise<string> }): Promise<unknown> {
  const text = await body.text()
  if (!text) return null
  return JSON.parse(text) as unknown
}

function upstreamHeaders(request: FastifyRequest): Record<string, string> {
  const headers: Record<string, string> = {
    [SERVICE_CONTEXT_HEADER]: request.viewer_session.service_context_jwt,
    [REQUEST_ID_HEADER]: request.request_id,
    [CORRELATION_ID_HEADER]: request.correlation_id,
  }
  const idempotency_key = first(request.headers[IDEMPOTENCY_KEY_HEADER])
  if (idempotency_key) headers[IDEMPOTENCY_KEY_HEADER] = idempotency_key
  if (request.viewer_session.session_id) headers['x-session-id'] = request.viewer_session.session_id
  return headers
}

async function forward(proxy: ProxyService, request: FastifyRequest, url: string) {
  const entry = resolveRoute(url)
  if (!entry) return null
  return proxy.forward({
    entry,
    method: request.method === 'POST' ? 'POST' : 'GET',
    url,
    headers: upstreamHeaders(request),
    body: undefined,
    content_length: undefined,
  })
}

const AUTH_ERRORS = new Set(['registration_closed', 'restricted'])

function redirectAuthError(reply: FastifyReply, error: string | undefined): FastifyReply {
  const code = error && AUTH_ERRORS.has(error) ? error : 'unknown'
  return reply.redirect(`/?auth_error=${code}`)
}

/**
 * Особые маршруты входа. Остальной `/v1/auth/*` (старт Google) идёт общим прокси:
 * identity отвечает 302 на издателя, gateway только передаёт его браузеру.
 */
export const authGatewayRoutes: FastifyPluginAsync<AuthGatewayOptions> = async (app, options) => {
  app.get('/v1/auth/session', async (request, reply) => {
    if (!request.viewer_session.session_id || request.viewer_session.context.role === 'guest') {
      return reply.send(sessionResponseSchema.parse({ status: 'guest' }))
    }
    const upstream = await forward(options.proxy, request, '/v1/auth/session')
    if (!upstream || upstream.status !== 200) return reply.send(sessionResponseSchema.parse({ status: 'guest' }))
    const parsed = identityMemberSchema.safeParse(await readJson(upstream.body))
    if (!parsed.success) return reply.send(sessionResponseSchema.parse({ status: 'guest' }))

    let profile = {
      display_name: parsed.data.display_name_hint,
      avatar_url: null as string | null,
      slug: String(parsed.data.user.public_number),
    }
    const card = await forward(options.proxy, request, `/v1/profiles/${parsed.data.user.public_number}`)
    if (card && card.status === 200) {
      const full = profileSchema.safeParse(await readJson(card.body))
      if (full.success) {
        profile = {
          display_name: full.data.display_name,
          avatar_url: full.data.avatar_url,
          slug: full.data.slug ?? String(full.data.public_number),
        }
      }
    }
    return reply.send(sessionResponseSchema.parse({ status: 'member', user: parsed.data.user, profile }))
  })

  app.get('/v1/auth/google/callback', async (request, reply) => {
    const upstream = await forward(options.proxy, request, request.raw.url ?? request.url)
    if (!upstream) return redirectAuthError(reply, 'unknown')
    const body = callbackBodySchema.safeParse(await readJson(upstream.body))
    if (!body.success || upstream.status >= 400 || 'error' in body.data) {
      return redirectAuthError(reply, body.success && 'error' in body.data ? body.data.error : 'unknown')
    }
    const max_age = Number(first(upstream.headers[SET_SESSION_MAX_AGE_HEADER]))
    setSessionCookie(reply, options.cookies, body.data.session_id, Number.isFinite(max_age) && max_age > 0 ? max_age : undefined)
    return reply.redirect(safeReturnTo(body.data.return_to))
  })

  app.post('/v1/auth/logout', async (request, reply) => {
    const session_id = request.viewer_session.session_id
    await forward(options.proxy, request, '/v1/auth/logout')
    if (session_id) options.sessions.invalidate([session_id])
    clearSessionCookie(reply, options.cookies)
    return reply.code(204).send()
  })
}
