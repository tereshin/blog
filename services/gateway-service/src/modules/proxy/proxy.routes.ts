import type { FastifyPluginAsync } from 'fastify'
import { NotFoundError } from '@blog/errors'
import { CORRELATION_ID_HEADER, IDEMPOTENCY_KEY_HEADER, REQUEST_ID_HEADER } from '@blog/http-kit'
import { SERVICE_CONTEXT_HEADER } from '@blog/contracts'
import { clearSessionCookie, setSessionCookie } from '../session/index.ts'
import type { CookieNames } from '../session/index.ts'
import {
  CLEAR_SESSION_HEADER,
  SESSION_ID_HEADER,
  SET_SESSION_HEADER,
  SET_SESSION_MAX_AGE_HEADER,
} from '../session/index.ts'
import { filterRequestHeaders, filterResponseHeaders } from './proxy.service.ts'
import type { ProxyService } from './proxy.service.ts'
import { resolveRoute } from './route-table.ts'
import type { Readable } from 'node:stream'

export type ProxyRoutesOptions = {
  proxy: ProxyService
  cookies: CookieNames
}

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH'])

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/**
 * `/v1/*` → сервис-владелец. Тело идёт потоком (JSON не разбирается), cookie сервисам не видны:
 * они получают подписанный `X-Service-Context`. Мост сессий: identity просит поставить или снять cookie
 * внутренними заголовками, которые gateway снимает с ответа.
 */
export const proxyRoutes: FastifyPluginAsync<ProxyRoutesOptions> = async (app, options) => {
  app.removeAllContentTypeParsers()
  app.addContentTypeParser('*', (_request, payload, done) => done(null, payload))

  app.all('/v1/*', async (request, reply) => {
    const entry = resolveRoute(request.url)
    if (!entry) throw new NotFoundError()

    const { viewer_session } = request
    const headers = filterRequestHeaders(request.headers)
    headers[SERVICE_CONTEXT_HEADER] = viewer_session.service_context_jwt
    headers[REQUEST_ID_HEADER] = request.request_id
    headers[CORRELATION_ID_HEADER] = request.correlation_id
    headers['x-forwarded-for'] = request.ip
    const idempotency_key = first(request.headers[IDEMPOTENCY_KEY_HEADER])
    if (idempotency_key) headers[IDEMPOTENCY_KEY_HEADER] = idempotency_key
    // Идентификатор сессии нужен только identity (выход, список сессий); остальным он не отдаётся.
    if (entry.service === 'identity' && viewer_session.session_id) headers[SESSION_ID_HEADER] = viewer_session.session_id

    const raw_length = first(request.headers['content-length'])
    const result = await options.proxy.forward({
      entry,
      method: request.method,
      url: request.raw.url ?? request.url,
      headers,
      body: METHODS_WITH_BODY.has(request.method) ? (request.body as Readable | undefined) : undefined,
      content_length: raw_length === undefined ? undefined : Number(raw_length),
    })

    const new_session = first(result.headers[SET_SESSION_HEADER])
    if (new_session && entry.service === 'identity') {
      const max_age = Number(first(result.headers[SET_SESSION_MAX_AGE_HEADER]))
      setSessionCookie(reply, options.cookies, new_session, Number.isFinite(max_age) && max_age > 0 ? max_age : undefined)
    } else if (first(result.headers[CLEAR_SESSION_HEADER]) && entry.service === 'identity') {
      clearSessionCookie(reply, options.cookies)
    }

    const response_headers = filterResponseHeaders(result.headers)
    return reply.code(result.status).headers(response_headers).send(result.body)
  })
}
