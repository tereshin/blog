import { useEffect } from 'react'
import { useShellStore } from './useShellStore.ts'
import type { HeaderCenterMode } from './useShellStore.ts'

type ShellPageOptions = {
  /** Центр шапки на этой странице; по умолчанию пусто. */
  header_center?: HeaderCenterMode
  /** Сбросить подсветку темы статьи, которая осталась от прошлого раздела. */
  should_clear_topic?: boolean
  /** Лента, открытие которой запоминается для полосы «новое». */
  seen_feed?: 'fresh' | 'mine' | null
}

/** Настраивает каркас под страницу: центр шапки, подсветку темы и отметку просмотра ленты. */
export function useShellPage({ header_center, should_clear_topic = false, seen_feed = null }: ShellPageOptions = {}): void {
  const setHeaderCenter = useShellStore((state) => state.setHeaderCenter)
  const setArticleTopicId = useShellStore((state) => state.setArticleTopicId)
  const markFeedSeen = useShellStore((state) => state.markFeedSeen)
  const center_kind = header_center?.kind ?? 'empty'
  const center_title = header_center?.kind === 'back' ? header_center.title : null
  const center_to = header_center?.kind === 'back' ? header_center.to : undefined

  useEffect(() => {
    setHeaderCenter(
      center_kind === 'back' && center_title !== null
        ? { kind: 'back', title: center_title, ...(center_to ? { to: center_to } : {}) }
        : center_kind === 'search'
          ? { kind: 'search' }
          : { kind: 'empty' },
    )
  }, [center_kind, center_title, center_to, setHeaderCenter])

  useEffect(() => {
    if (should_clear_topic) setArticleTopicId(null)
  }, [should_clear_topic, setArticleTopicId])

  useEffect(() => {
    if (seen_feed) markFeedSeen(seen_feed)
  }, [seen_feed, markFeedSeen])
}
