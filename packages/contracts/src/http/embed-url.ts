const EMBED_PATHS: Record<string, readonly [string, RegExp][]> = {
  youtube: [
    ['www.youtube.com', /^\/embed\//],
    ['www.youtube-nocookie.com', /^\/embed\//],
  ],
  vimeo: [['player.vimeo.com', /^\/video\//]],
  twitter: [['platform.twitter.com', /^\/embed\//]],
  github: [['github.com', /^\/[\w-]+\/[\w.-]+/]],
  codepen: [['codepen.io', /^\/[^/]+\/embed\//]],
}
/** Only provider-owned embed URLs enter an iframe, including in local previews. */
export function safeEmbedUrl(service: string, value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null
    return EMBED_PATHS[service]?.some(
      ([host, path]) => url.hostname === host && path.test(url.pathname),
    )
      ? url.href
      : null
  } catch {
    return null
  }
}
