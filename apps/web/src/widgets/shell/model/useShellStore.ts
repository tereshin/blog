import { create } from 'zustand'

/** Что стоит в центре шапки: пилюля с первой карточкой, поле поиска или «назад» с названием. */
export type HeaderCenterMode = { kind: 'pill' } | { kind: 'search' } | { kind: 'back'; title: string }

type ShellState = {
  is_nav_open: boolean
  center_scroll_top: number
  left_scroll_top: number
  header_center: HeaderCenterMode
  /** Тема загруженной статьи: по ней подсвечивается пункт темы на `/p/{slug}`. */
  article_topic_id: string | null
  setNavOpen: (is_open: boolean) => void
  setCenterScrollTop: (value: number) => void
  setLeftScrollTop: (value: number) => void
  setHeaderCenter: (value: HeaderCenterMode) => void
  setArticleTopicId: (value: string | null) => void
}

/** Потребители читают срезами: `useShellStore((state) => state.is_nav_open)`. */
export const useShellStore = create<ShellState>((set) => ({
  is_nav_open: false,
  center_scroll_top: 0,
  left_scroll_top: 0,
  header_center: { kind: 'pill' },
  article_topic_id: null,
  setNavOpen: (is_nav_open) => set({ is_nav_open }),
  setCenterScrollTop: (center_scroll_top) => set({ center_scroll_top }),
  setLeftScrollTop: (left_scroll_top) => set({ left_scroll_top }),
  setHeaderCenter: (header_center) => set({ header_center }),
  setArticleTopicId: (article_topic_id) => set({ article_topic_id }),
}))
