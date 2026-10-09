const DEFAULT_PER_MINUTE = 600

/**
 * Потолок запросов в минуту для публичных мутаций.
 * Остальные маршруты остаются на общем пределе.
 */
export function rateLimitForPath(path: string): number {
  const url = path.split('?')[0] ?? path
  if (url.startsWith('/v1/auth')) return 30
  if (url.startsWith('/v1/reactions')) return 60
  if (/^\/v1\/articles\/[^/]+\/comments(?:\/|$)/.test(url)) return 30
  if (url.startsWith('/v1/media')) return 30
  if (url.startsWith('/v1/conversations')) return 60
  return DEFAULT_PER_MINUTE
}
