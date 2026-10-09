import { HttpResponse, http } from 'msw'
import { buildFeedFixture } from '../fixtures/feed.ts'
import type { FeedCardFixture } from '../fixtures/feed.ts'
import { publishedFeedCards } from './articles-store.ts'

export const MOCK_FEED_KEY = 'mock_feed'
const PAGE_SIZE = 20

/** Сценарий ленты в режиме мока: обычная, пустая или с ошибкой. Задаётся флагом в `localStorage` (только при VITE_API_MOCK=1). */
export function readMockFeed(): 'normal' | 'empty' | 'error' {
  const stored = window.localStorage.getItem(MOCK_FEED_KEY)
  return stored === 'empty' || stored === 'error' ? stored : 'normal'
}

export const mockFeedArticles = buildFeedFixture()
const all = mockFeedArticles

function select(mode: string): FeedCardFixture[] {
  const source = [...publishedFeedCards(), ...all]
  if (mode === 'popular') return [...source].sort((a, b) => b.reaction_count + b.comment_count - (a.reaction_count + a.comment_count) || (a.id < b.id ? 1 : -1))
  if (mode.startsWith('topic:')) return source.filter((article) => article.topic.slug === mode.slice('topic:'.length))
  return source
}

export const feedHandlers = [
  http.get('*/v1/feed', ({ request }) => {
    const scenario = readMockFeed()
    if (scenario === 'error') return HttpResponse.json({ code: 'internal', title: 'Сбой' }, { status: 500 })
    if (scenario === 'empty') return HttpResponse.json({ items: [], next_cursor: null })

    const url = new URL(request.url)
    const items = select(url.searchParams.get('mode') ?? 'fresh')
    const offset = Number(url.searchParams.get('cursor') ?? 0) || 0
    const page = items.slice(offset, offset + PAGE_SIZE)
    const next = offset + PAGE_SIZE
    return HttpResponse.json({ items: page, next_cursor: next < items.length ? String(next) : null })
  }),
]
