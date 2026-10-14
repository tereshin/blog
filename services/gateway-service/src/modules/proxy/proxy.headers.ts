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
