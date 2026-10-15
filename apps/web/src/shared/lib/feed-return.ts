const KEY = 'feedReturn'

// This document owns restoration eligibility; a reload must not reuse old offsets.
let departure_key: string | null = null

export type FeedReturn = { mode: string; scroll_top: number; feed_key: string; entry_key?: string; path?: string }

function pathOf(mode: string): string {
  if (mode === 'popular') return '/popular'
  if (mode === 'mine') return '/feed'
  if (mode.startsWith('topic:')) return `/t/${encodeURIComponent(mode.slice('topic:'.length))}`
  return '/'
}

/** Запоминает ленту и прокрутку центра, чтобы «Назад» со статьи вернуло на то же место. */
export function saveFeedReturn(value: FeedReturn): void {
  sessionStorage.setItem(KEY, JSON.stringify(value))
  departure_key = value.entry_key ?? null
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
    const entry_key = 'entry_key' in parsed && typeof parsed.entry_key === 'string' ? parsed.entry_key : undefined
    const path = 'path' in parsed && typeof parsed.path === 'string' ? parsed.path : undefined
    return { mode, scroll_top, feed_key, ...(entry_key ? { entry_key } : {}), ...(path ? { path } : {}) }
  } catch {
    return null
  }
}

/** Куда вести «Назад». Прямая ссылка без сохранённой ленты открывает «Свежее». */
export function getReturnTarget(): { path: string; scroll_top: number } {
  const saved = readFeedReturn()
  if (!saved) return { path: '/', scroll_top: 0 }
  return { path: saved.path ?? pathOf(saved.mode), scroll_top: saved.scroll_top }
}

/** Only an in-document departure may restore an offset, on POP or explicit Back. */
export function feedReturnForNavigation(entry_key: string, explicit_key: unknown, is_pop: boolean): FeedReturn | null {
  const saved = readFeedReturn()
  if (!departure_key || saved?.entry_key !== departure_key) return null
  return (is_pop && entry_key === departure_key) || explicit_key === departure_key ? saved : null
}

export function cancelFeedReturn(): void {
  departure_key = null
}
