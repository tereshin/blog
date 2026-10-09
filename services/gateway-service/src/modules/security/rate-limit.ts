const DEFAULT_PER_MINUTE = 600

const MAX_BY_GROUP = {
  auth: 30,
  reactions: 60,
  comments: 30,
  media: 30,
  conversations: 60,
  default: DEFAULT_PER_MINUTE,
} as const

export type RateLimitGroup = keyof typeof MAX_BY_GROUP

function pathOnly(path: string): string {
  return path.split('?')[0] ?? path
}

/**
 * Группа лимита. Счётчик у каждой группы свой: чтение ленты не съедает бюджет входа.
 * `GET /v1/auth/session` и `GET /v1/auth/config` — чтения, их потолок общий.
 */
export function rateLimitGroup(path: string): RateLimitGroup {
  const url = pathOnly(path)
  if (url === '/v1/auth/session' || url === '/v1/auth/config') return 'default'
  if (url.startsWith('/v1/auth')) return 'auth'
  if (url.startsWith('/v1/reactions')) return 'reactions'
  if (/^\/v1\/articles\/[^/]+\/comments(?:\/|$)/.test(url)) return 'comments'
  if (url.startsWith('/v1/media')) return 'media'
  if (url.startsWith('/v1/conversations')) return 'conversations'
  return 'default'
}

/** Потолок запросов в минуту для публичных мутаций. Остальные маршруты остаются на общем пределе. */
export function rateLimitForPath(path: string): number {
  return MAX_BY_GROUP[rateLimitGroup(path)]
}
