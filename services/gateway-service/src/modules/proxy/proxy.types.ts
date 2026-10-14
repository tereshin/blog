import type { Readable } from 'node:stream'
import type { Dispatcher, Pool } from 'undici'
import type { CircuitBreaker } from '@blog/http-kit'
import type { RouteEntry } from '../../shared/route-table.ts'

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

/** Что о зрителе и запросе уходит сервису-владельцу. */
export type ViewerHeadersInput = {
  headers: Record<string, string | string[] | undefined>
  service_context_jwt: string
  request_id: string
  correlation_id: string
  ip: string
  session_id: string | null
}

/** Просьба identity к gateway о cookie сессии, прочитанная из заголовков ответа. */
export type SessionBridge =
  | { action: 'set'; session_id: string; max_age_seconds: number | undefined }
  | { action: 'clear' }
  | { action: 'none' }
