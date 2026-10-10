import { create } from 'zustand'

/** Что стоит в центре шапки: пусто, поле поиска или «назад» с названием. */
export type HeaderCenterMode = { kind: 'empty' } | { kind: 'search' } | { kind: 'back'; title: string }

type ShellState = {
  is_nav_open: boolean
  center_scroll_top: number
  left_scroll_top: number
  header_center: HeaderCenterMode
  /** Центр шапки до открытия поиска: закрытие возвращает его. */
  previous_center: HeaderCenterMode
  /** Тема загруженной статьи: по ней подсвечивается пункт темы на `/p/{slug}`. */
  article_topic_id: string | null
  /** «Показать все» в списке тем раскрыт. */
  is_topics_expanded: boolean
  /** Последние запросы поиска в этой вкладке. Не пишем их в storage: это введённый текст. */
  recent_searches: string[]
  /** Момент последнего открытия «Свежего» и «Моей ленты» (`lastSeenFeed:{mode}`). */
  feed_seen_at: { fresh: string | null; mine: string | null }
  setNavOpen: (is_open: boolean) => void
  setCenterScrollTop: (value: number) => void
  setLeftScrollTop: (value: number) => void
  setHeaderCenter: (value: HeaderCenterMode) => void
  openSearch: () => void
  closeSearch: () => void
  setArticleTopicId: (value: string | null) => void
  setTopicsExpanded: (value: boolean) => void
  rememberSearch: (query: string) => void
  clearRecentSearches: () => void
  markFeedSeen: (mode: 'fresh' | 'mine') => void
}

function readFeedSeen(): ShellState['feed_seen_at'] {
  if (typeof sessionStorage === 'undefined') return { fresh: null, mine: null }
  return {
    fresh: sessionStorage.getItem('lastSeenFeed:fresh'),
    mine: sessionStorage.getItem('lastSeenFeed:mine'),
  }
}

/** Потребители читают срезами: `useShellStore((state) => state.is_nav_open)`. */
export const useShellStore = create<ShellState>((set) => ({
  is_nav_open: false,
  center_scroll_top: 0,
  left_scroll_top: 0,
  header_center: { kind: 'empty' },
  previous_center: { kind: 'empty' },
  article_topic_id: null,
  is_topics_expanded: false,
  recent_searches: [],
  feed_seen_at: readFeedSeen(),
  setNavOpen: (is_nav_open) => set({ is_nav_open }),
  setCenterScrollTop: (center_scroll_top) => set({ center_scroll_top }),
  setLeftScrollTop: (left_scroll_top) => set({ left_scroll_top }),
  setHeaderCenter: (header_center) =>
    set((state) => {
      // Эффект страницы не должен сбрасывать открытый поиск.
      if (state.header_center.kind === 'search' && header_center.kind !== 'search') {
        return { previous_center: header_center }
      }
      return { header_center }
    }),
  openSearch: () =>
    set((state) => ({
      previous_center: state.header_center.kind === 'search' ? state.previous_center : state.header_center,
      header_center: { kind: 'search' },
    })),
  closeSearch: () =>
    set((state) => ({ header_center: state.previous_center.kind === 'search' ? { kind: 'empty' } : state.previous_center })),
  setArticleTopicId: (article_topic_id) => set({ article_topic_id }),
  setTopicsExpanded: (is_topics_expanded) => set({ is_topics_expanded }),
  rememberSearch: (query) =>
    set((state) => {
      const text = query.trim()
      if (text.length < 2) return state
      return { recent_searches: [text, ...state.recent_searches.filter((item) => item !== text)].slice(0, 8) }
    }),
  clearRecentSearches: () => set({ recent_searches: [] }),
  markFeedSeen: (mode) => {
    const at = new Date().toISOString()
    sessionStorage.setItem(`lastSeenFeed:${mode}`, at)
    set((state) => ({ feed_seen_at: { ...state.feed_seen_at, [mode]: at } }))
  },
}))
