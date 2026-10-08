import pino, { type Logger } from 'pino'

export type { Logger } from 'pino'

export type RequestLogContext = {
  request_id: string
  correlation_id: string
  trace_id?: string
}

export type CreateLoggerOptions = {
  service: string
  level?: string
}

/** Поля, значения которых никогда не попадают в лог (session-security.mdc). */
export const REDACT_PATHS = [
  'authorization',
  'cookie',
  'set-cookie',
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'req.body.password',
  '*.token',
  '*.access_token',
  '*.refresh_token',
  '*.id_token',
] as const

/** Корневой логгер сервиса: JSON, в каждой записи `service`. */
export function createLogger(options: CreateLoggerOptions): Logger {
  return pino({
    level: options.level ?? 'info',
    base: { service: options.service },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: { paths: [...REDACT_PATHS], censor: '[REDACTED]' },
  })
}

/** Дочерний логгер запроса: `request_id`, `correlation_id`, `trace_id` в каждой записи. */
export function createRequestLogger(base: Logger, context: RequestLogContext): Logger {
  return base.child({
    request_id: context.request_id,
    correlation_id: context.correlation_id,
    trace_id: context.trace_id ?? null,
  })
}
