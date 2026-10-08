export type UpstreamName = 'identity' | 'content' | 'discussion' | 'messaging' | 'notification' | 'media'

export type RouteEntry = {
  prefix: string
  service: UpstreamName
  /** Максимальный размер тела запроса, байт. */
  max_body_bytes?: number
  /** Таймаут ожидания ответа сервиса, мс. По умолчанию 3 с (node-microservices.mdc). */
  timeout_ms?: number
}

const MB = 1024 * 1024

/** Префикс → сервис-владелец. Порядок не важен: выбирается самый длинный префикс. */
export const ROUTE_TABLE: readonly RouteEntry[] = [
  { prefix: '/v1/auth', service: 'identity' },
  { prefix: '/v1/users', service: 'identity' },
  { prefix: '/v1/feed', service: 'content' },
  { prefix: '/v1/articles', service: 'content' },
  { prefix: '/v1/topics', service: 'content' },
  { prefix: '/v1/profiles', service: 'content' },
  { prefix: '/v1/follows', service: 'content' },
  { prefix: '/v1/settings', service: 'content' },
  { prefix: '/v1/search', service: 'content' },
  { prefix: '/v1/rating', service: 'content' },
  { prefix: '/v1/reports', service: 'content' },
  { prefix: '/v1/moderation', service: 'content' },
  { prefix: '/v1/comments', service: 'discussion' },
  { prefix: '/v1/reactions', service: 'discussion' },
  { prefix: '/v1/bookmarks', service: 'discussion' },
  { prefix: '/v1/feed-seen', service: 'discussion' },
  { prefix: '/v1/me/article-states', service: 'discussion' },
  { prefix: '/v1/conversations', service: 'messaging' },
  { prefix: '/v1/notifications', service: 'notification' },
  { prefix: '/v1/media', service: 'media', max_body_bytes: 20 * MB, timeout_ms: 30_000 },
]

export const DEFAULT_MAX_BODY_BYTES = 1 * MB
export const DEFAULT_TIMEOUT_MS = 3_000

function matches(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`)
}

/** Самый длинный подходящий префикс; `/v1/feed-seen` не путается с `/v1/feed`. */
export function resolveRoute(path: string, table: readonly RouteEntry[] = ROUTE_TABLE): RouteEntry | null {
  let best: RouteEntry | null = null
  for (const entry of table) {
    if (matches(path, entry.prefix) && (!best || entry.prefix.length > best.prefix.length)) best = entry
  }
  return best
}
