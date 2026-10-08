import { Pool } from 'undici'
import { AppError } from '@blog/errors'
import { SERVICE_CONTEXT_HEADER } from '@blog/contracts'
import { CircuitBreaker } from './circuit-breaker.ts'
import type { CircuitBreakerOptions } from './circuit-breaker.ts'
import { CORRELATION_ID_HEADER, IDEMPOTENCY_KEY_HEADER, REQUEST_ID_HEADER } from './request-context.ts'

export type ServiceRequest = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  /** Подписанный служебный JWT, прокидывается как `X-Service-Context`. */
  service_context?: string
  request_id?: string
  correlation_id?: string
  idempotency_key?: string
  headers?: Record<string, string>
  body?: unknown
}

export type ServiceResponse = {
  status: number
  headers: Record<string, string | string[] | undefined>
  body: unknown
}

export type ServiceClientOptions = {
  name: string
  base_url: string
  timeout_ms?: number
  max_retries?: number
  connections?: number
  breaker?: CircuitBreakerOptions
}

export type ServiceClient = {
  request: (input: ServiceRequest) => Promise<ServiceResponse>
  close: () => Promise<void>
}

const DEFAULT_TIMEOUT_MS = 3_000
const DEFAULT_RETRIES = 2

export class ServiceUnavailableError extends AppError {
  constructor(service: string, cause?: unknown) {
    super({
      code: 'service_unavailable',
      http_status: 503,
      message: `Сервис ${service} недоступен`,
      ...(cause === undefined ? {} : { cause }),
    })
  }
}

/** Задержка перед повтором: экспоненциальный backoff с jitter, потолок 2 с. */
export function retryDelayMs(attempt: number, random: () => number = Math.random): number {
  const cap = Math.min(2_000, 100 * 2 ** attempt)
  return Math.round(cap / 2 + random() * (cap / 2))
}

/** Повторять можно только идемпотентное: GET и запросы с ключом идемпотентности. */
export function isRetryable(input: Pick<ServiceRequest, 'method' | 'idempotency_key'>): boolean {
  return (input.method ?? 'GET') === 'GET' || input.idempotency_key !== undefined
}

async function parseBody(raw: { text: () => Promise<string> }): Promise<unknown> {
  const text = await raw.text()
  if (text === '') return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

/** undici-клиент: keep-alive пул, таймаут 3 с, circuit breaker, ретраи для идемпотентных запросов. */
export function createServiceClient(options: ServiceClientOptions): ServiceClient {
  const pool = new Pool(options.base_url, { connections: options.connections ?? 16, keepAliveTimeout: 30_000 })
  const breaker = new CircuitBreaker(options.breaker)
  const timeout_ms = options.timeout_ms ?? DEFAULT_TIMEOUT_MS
  const max_retries = options.max_retries ?? DEFAULT_RETRIES

  async function attemptOnce(input: ServiceRequest): Promise<ServiceResponse> {
    const headers: Record<string, string> = { accept: 'application/json', ...input.headers }
    if (input.body !== undefined) headers['content-type'] = 'application/json'
    if (input.service_context) headers[SERVICE_CONTEXT_HEADER] = input.service_context
    if (input.request_id) headers[REQUEST_ID_HEADER] = input.request_id
    if (input.correlation_id) headers[CORRELATION_ID_HEADER] = input.correlation_id
    if (input.idempotency_key) headers[IDEMPOTENCY_KEY_HEADER] = input.idempotency_key

    const response = await pool.request({
      method: input.method ?? 'GET',
      path: input.path,
      headers,
      ...(input.body === undefined ? {} : { body: JSON.stringify(input.body) }),
      headersTimeout: timeout_ms,
      bodyTimeout: timeout_ms,
    })
    return { status: response.statusCode, headers: response.headers, body: await parseBody(response.body) }
  }

  async function request(input: ServiceRequest): Promise<ServiceResponse> {
    if (!breaker.canRequest()) throw new ServiceUnavailableError(options.name)
    const retries = isRetryable(input) ? max_retries : 0
    let last_error: unknown
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const response = await attemptOnce(input)
        // 5xx — сбой сервиса: считается для breaker и повторяется; 4xx — ответ по делу.
        if (response.status >= 500) {
          breaker.onFailure()
          last_error = new Error(`${options.name}: ответ ${response.status}`)
          if (attempt === retries) return response
        } else {
          breaker.onSuccess()
          return response
        }
      } catch (error) {
        breaker.onFailure()
        last_error = error
      }
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, retryDelayMs(attempt)))
    }
    throw new ServiceUnavailableError(options.name, last_error)
  }

  return { request, close: () => pool.close() }
}
