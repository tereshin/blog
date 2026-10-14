import { Transform } from 'node:stream'
import { Pool } from 'undici'
import type { Dispatcher } from 'undici'
import { SERVICE_CONTEXT_HEADER } from '@blog/contracts'
import { NotFoundError } from '@blog/errors'
import {
  CircuitBreaker,
  CORRELATION_ID_HEADER,
  IDEMPOTENCY_KEY_HEADER,
  REQUEST_ID_HEADER,
  ServiceUnavailableError,
} from '@blog/http-kit'
import {
  CLEAR_SESSION_HEADER,
  SESSION_ID_HEADER,
  SET_SESSION_HEADER,
  SET_SESSION_MAX_AGE_HEADER,
} from '../session/index.ts'
import { firstHeader } from '../../shared/first-header.ts'
import { DEFAULT_MAX_BODY_BYTES, DEFAULT_TIMEOUT_MS, resolveRoute } from '../../shared/route-table.ts'
import type { RouteEntry, UpstreamName } from '../../shared/route-table.ts'
import { PayloadTooLargeError } from './proxy.errors.ts'
import { filterRequestHeaders } from './proxy.headers.ts'
import type { ForwardInput, ForwardResult, SessionBridge, Upstream, ViewerHeadersInput } from './proxy.types.ts'

/** Считает байты потоком: тело без `Content-Length` (chunked) тоже ограничено. */
export function limitBytes(limit: number): Transform {
  let seen = 0
  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      seen += chunk.length
      if (seen > limit) callback(new PayloadTooLargeError(limit))
      else callback(null, chunk)
    },
  })
}

export class ProxyService {
  private readonly upstreams: Record<UpstreamName, Upstream>

  constructor(urls: Record<UpstreamName, string>) {
    const make = (url: string): Upstream => ({
      pool: new Pool(url, { connections: 32, keepAliveTimeout: 30_000 }),
      breaker: new CircuitBreaker(),
    })
    this.upstreams = {
      identity: make(urls.identity),
      content: make(urls.content),
      discussion: make(urls.discussion),
      messaging: make(urls.messaging),
      notification: make(urls.notification),
      media: make(urls.media),
    }
  }

  /** Сервис-владелец пути; неизвестный префикс — 404. */
  routeFor(url: string): RouteEntry {
    const entry = resolveRoute(url)
    if (!entry) throw new NotFoundError()
    return entry
  }

  /** Заголовки клиента без подделываемых и служебный контекст зрителя вместо cookie. */
  upstreamHeaders(entry: RouteEntry, input: ViewerHeadersInput): Record<string, string | string[]> {
    const headers = filterRequestHeaders(input.headers)
    headers[SERVICE_CONTEXT_HEADER] = input.service_context_jwt
    headers[REQUEST_ID_HEADER] = input.request_id
    headers[CORRELATION_ID_HEADER] = input.correlation_id
    headers['x-forwarded-for'] = input.ip
    const idempotency_key = firstHeader(input.headers[IDEMPOTENCY_KEY_HEADER])
    if (idempotency_key) headers[IDEMPOTENCY_KEY_HEADER] = idempotency_key
    // Идентификатор сессии нужен только identity (выход, список сессий); остальным он не отдаётся.
    if (entry.service === 'identity' && input.session_id) headers[SESSION_ID_HEADER] = input.session_id
    return headers
  }

  /** Мост сессий: ставить или снимать cookie может просить только identity. */
  sessionBridge(entry: RouteEntry, headers: ForwardResult['headers']): SessionBridge {
    if (entry.service !== 'identity') return { action: 'none' }
    const new_session = firstHeader(headers[SET_SESSION_HEADER])
    if (new_session) {
      const max_age = Number(firstHeader(headers[SET_SESSION_MAX_AGE_HEADER]))
      return { action: 'set', session_id: new_session, max_age_seconds: Number.isFinite(max_age) && max_age > 0 ? max_age : undefined }
    }
    if (firstHeader(headers[CLEAR_SESSION_HEADER])) return { action: 'clear' }
    return { action: 'none' }
  }

  async forward(input: ForwardInput): Promise<ForwardResult> {
    const upstream = this.upstreams[input.entry.service]
    if (!upstream.breaker.canRequest()) throw new ServiceUnavailableError(input.entry.service)

    const max_body = input.entry.max_body_bytes ?? DEFAULT_MAX_BODY_BYTES
    if (input.content_length !== undefined && input.content_length > max_body) throw new PayloadTooLargeError(max_body)
    const timeout = input.entry.timeout_ms ?? DEFAULT_TIMEOUT_MS

    try {
      const body = input.body ? input.body.pipe(limitBytes(max_body)) : undefined
      body?.on('error', () => undefined) // ошибка лимита уйдёт в rejection запроса ниже
      const response = await upstream.pool.request({
        method: input.method as Dispatcher.HttpMethod,
        path: input.url,
        headers: input.headers,
        ...(body ? { body } : {}),
        headersTimeout: timeout,
        bodyTimeout: timeout,
      })
      if (response.statusCode >= 500) upstream.breaker.onFailure()
      else upstream.breaker.onSuccess()
      return { status: response.statusCode, headers: response.headers, body: response.body }
    } catch (error) {
      if (error instanceof PayloadTooLargeError) throw error
      if (error instanceof Error && error.cause instanceof PayloadTooLargeError) throw error.cause
      upstream.breaker.onFailure()
      throw new ServiceUnavailableError(input.entry.service, error)
    }
  }

  async close(): Promise<void> {
    await Promise.all(Object.values(this.upstreams).map((upstream) => upstream.pool.close()))
  }
}
