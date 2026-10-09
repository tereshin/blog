const KEY = 'feedReturn'

export type FeedReturn = { mode: string; scroll_top: number; feed_key: string }

function pathOf(mode: string): string {
  if (mode === 'popular') return '/popular'
  if (mode === 'mine') return '/feed'
  if (mode.startsWith('topic:')) return `/t/${encodeURIComponent(mode.slice('topic:'.length))}`
  return '/'
}

/** Запоминает ленту и прокрутку центра, чтобы «Назад» со статьи вернуло на то же место. */
export function saveFeedReturn(value: FeedReturn): void {
  sessionStorage.setItem(KEY, JSON.stringify(value))
}

export function readFeedReturn(): FeedReturn | null {
  const raw = sessionStorage.getItem(KEY)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const mode = 'mode' in parsed ? parsed.mode : null
    const scroll_top = 'scroll_top' in parsed ? parsed.scroll_top : null
    const feed_key = 'feed_key' in parsed && typeof parsed.feed_key === 'string' ? parsed.feed_key : mode
    if (typeof mode !== 'string' || typeof feed_key !== 'string' || typeof scroll_top !== 'number' || !Number.isFinite(scroll_top)) return null
    return { mode, scroll_top, feed_key }
  } catch {
    return null
  }
}

/** Куда вести «Назад». Прямая ссылка без сохранённой ленты открывает «Свежее». */
export function getReturnTarget(): { path: string; scroll_top: number } {
  const saved = readFeedReturn()
  if (!saved) return { path: '/', scroll_top: 0 }
  return { path: pathOf(saved.mode), scroll_top: saved.scroll_top }
}
