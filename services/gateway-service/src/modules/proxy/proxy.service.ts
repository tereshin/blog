import { Transform } from 'node:stream'
import type { Readable } from 'node:stream'
import { Pool } from 'undici'
import type { Dispatcher } from 'undici'
import { AppError } from '@blog/errors'
import { CircuitBreaker, ServiceUnavailableError } from '@blog/http-kit'
import { DEFAULT_MAX_BODY_BYTES, DEFAULT_TIMEOUT_MS } from './route-table.ts'
import type { RouteEntry, UpstreamName } from './route-table.ts'

/** Заголовки, которые не пересылаются сервисам: hop-by-hop, cookie и всё, что клиент мог подделать. */
const STRIP_REQUEST_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'cookie',
  'authorization',
  'x-service-context',
  'x-session-id',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  // Внутренние заголовки моста сессий: от клиента их быть не может.
  'x-set-session',
  'x-set-session-max-age',
  'x-clear-session',
])

/** Заголовки ответа, которые не уходят клиенту: hop-by-hop и `set-cookie` (cookie ставит только gateway). */
const STRIP_RESPONSE_HEADERS = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
  'proxy-authenticate',
  'set-cookie',
  // Мост сессий: gateway читает эти заголовки сам и клиенту их не показывает.
  'x-set-session',
  'x-set-session-max-age',
  'x-clear-session',
])

export function filterRequestHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {}
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined || STRIP_REQUEST_HEADERS.has(name.toLowerCase())) continue
    result[name.toLowerCase()] = value
  }
  return result
}

export function filterResponseHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {}
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined || STRIP_RESPONSE_HEADERS.has(name.toLowerCase())) continue
    result[name.toLowerCase()] = value
  }
  return result
}

export class PayloadTooLargeError extends AppError {
  constructor(limit: number) {
    super({ code: 'payload_too_large', http_status: 413, message: 'Слишком большой запрос', details: { limit_bytes: limit } })
  }
}

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

export type ForwardInput = {
  entry: RouteEntry
  method: string
  /** Путь вместе с query, как пришёл (`request.raw.url`). */
  url: string
  headers: Record<string, string | string[]>
  body: Readable | undefined
  content_length: number | undefined
}

export type ForwardResult = {
  status: number
  headers: Record<string, string | string[] | undefined>
  body: Dispatcher.ResponseData['body']
}

export type Upstream = { pool: Pool; breaker: CircuitBreaker }

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
