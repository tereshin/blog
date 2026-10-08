import { z } from 'zod'
import { env } from '@/shared/config'
import { sessionEvents } from './session-events.ts'

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly detail: string | undefined
  readonly request_id: string | undefined
  readonly reason: string | undefined

  constructor(input: { code: string; status: number; message: string; detail?: string; request_id?: string; reason?: string }) {
    super(input.message)
    this.name = 'ApiError'
    this.code = input.code
    this.status = input.status
    this.detail = input.detail
    this.request_id = input.request_id
    this.reason = input.reason
  }
}

const problemSchema = z.looseObject({
  code: z.string().optional(),
  title: z.string().optional(),
  detail: z.string().optional(),
  request_id: z.string().optional(),
  errors: z.looseObject({ reason: z.string().optional() }).optional(),
})

export type QueryValue = string | number | boolean | null | undefined
export type RequestOptions = {
  query?: Record<string, QueryValue>
  body?: unknown
  signal?: AbortSignal | undefined
  headers?: Record<string, string>
  /** Повтор той же мутации после обрыва обязан нести тот же ключ. */
  idempotency_key?: string
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function readCsrfToken(cookie_source: string = document.cookie): string {
  for (const part of cookie_source.split(';')) {
    const [name, ...value] = part.trim().split('=')
    if (name === env.csrf_cookie_name) return decodeURIComponent(value.join('='))
  }
  return ''
}

export function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null) params.set(key, String(value))
  }
  const suffix = params.size > 0 ? `?${params.toString()}` : ''
  return `${env.api_base_url}${path}${suffix}`
}

async function toApiError(response: Response): Promise<ApiError> {
  const text = await response.text().catch(() => '')
  let problem: z.infer<typeof problemSchema> = {}
  try {
    const parsed = problemSchema.safeParse(JSON.parse(text))
    if (parsed.success) problem = parsed.data
  } catch {
    // Не problem+json (например, ответ прокси): достаточно статуса.
  }
  return new ApiError({
    code: problem.code ?? `http_${response.status}`,
    status: response.status,
    message: problem.title ?? response.statusText,
    ...(problem.detail ? { detail: problem.detail } : {}),
    ...(problem.request_id ? { request_id: problem.request_id } : {}),
    ...(problem.errors?.reason ? { reason: problem.errors.reason } : {}),
  })
}

export async function request<TResponse>(
  method: string,
  path: string,
  schema: z.ZodType<TResponse>,
  options: RequestOptions = {},
): Promise<TResponse> {
  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers }
  const has_body = options.body !== undefined
  if (has_body) headers['Content-Type'] = 'application/json'
  if (!SAFE_METHODS.has(method)) {
    headers['X-CSRF-Token'] = readCsrfToken()
    headers['X-Idempotency-Key'] = options.idempotency_key ?? crypto.randomUUID()
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      // Браузер сам прикладывает HttpOnly cookie сессии.
      credentials: 'include',
      headers,
      ...(has_body ? { body: JSON.stringify(options.body) } : {}),
      ...(options.signal ? { signal: options.signal } : {}),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError({ code: 'network_error', status: 0, message: 'Нет связи с сервером' })
  }

  if (response.status === 401) sessionEvents.emit('expired')
  if (!response.ok) throw await toApiError(response)
  if (response.status === 204) return schema.parse(undefined)

  const payload: unknown = await response.json()
  // Значения от API проверяются на границе: тип выводится из схемы.
  return schema.parse(payload)
}

export const http = {
  get: <TResponse>(path: string, schema: z.ZodType<TResponse>, options?: RequestOptions) => request('GET', path, schema, options),
  post: <TResponse>(path: string, schema: z.ZodType<TResponse>, options?: RequestOptions) => request('POST', path, schema, options),
  put: <TResponse>(path: string, schema: z.ZodType<TResponse>, options?: RequestOptions) => request('PUT', path, schema, options),
  patch: <TResponse>(path: string, schema: z.ZodType<TResponse>, options?: RequestOptions) => request('PATCH', path, schema, options),
  delete: <TResponse>(path: string, schema: z.ZodType<TResponse>, options?: RequestOptions) => request('DELETE', path, schema, options),
}

export const emptyResponseSchema = z.undefined()
