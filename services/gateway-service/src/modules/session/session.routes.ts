import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { SERVICE_CONTEXT_HEADER, profileSchema, sessionResponseSchema, sessionUserSchema } from '@blog/contracts'
import { CORRELATION_ID_HEADER, IDEMPOTENCY_KEY_HEADER, REQUEST_ID_HEADER } from '@blog/http-kit'
import type { ProxyService } from '../proxy/index.ts'
import { resolveRoute } from '../proxy/route-table.ts'
import { clearSessionCookie } from './session.cookies.ts'
import type { CookieNames } from './session.cookies.ts'
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

/**
 * Сессия и выход. `POST /v1/auth/sessions` идёт общим прокси: identity просит cookie
 * заголовком `x-set-session`, gateway ставит её и не отдаёт `session_id` браузеру.
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

  app.post('/v1/auth/logout', async (request, reply) => {
    const session_id = request.viewer_session.session_id
    await forward(options.proxy, request, '/v1/auth/logout')
    if (session_id) options.sessions.invalidate([session_id])
    clearSessionCookie(reply, options.cookies)
    return reply.code(204).send()
  })
}
