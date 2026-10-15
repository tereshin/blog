import { useCallback, useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router'
import type { MouseEvent } from 'react'
import type { FeedMode } from '@/entities/article'
import { feedReturnForNavigation, findScrollParent, saveFeedReturn } from '@/shared/lib'

export function useFeedReturn(mode: FeedMode, feed_key: string, is_ready: boolean) {
  const location = useLocation()
  const navigation_type = useNavigationType()
  const restored_ref = useRef<string | null>(null)
  const root_ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = feedReturnForNavigation(location.key, location.state?.feed_return_key, navigation_type === 'POP')
    if (!is_ready || !saved || saved.feed_key !== feed_key || saved.mode !== mode || restored_ref.current === location.key) return
    const frame = requestAnimationFrame(() => {
      restored_ref.current = location.key
      const scroller = findScrollParent(root_ref.current)
      if (scroller) scroller.scrollTo({ top: saved.scroll_top, behavior: 'instant' })
      else window.scrollTo({ top: saved.scroll_top, behavior: 'instant' })
    })
    return () => cancelAnimationFrame(frame)
  }, [mode, feed_key, is_ready, location.key, location.state, navigation_type])

  const rememberReturn = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const link = event.target instanceof Element ? event.target.closest('a') : null
      const href = link?.getAttribute('href') ?? ''
      if (!href.startsWith('/p/') || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const scroller = findScrollParent(root_ref.current)
      saveFeedReturn({ mode, feed_key, entry_key: location.key, path: location.pathname + location.search, scroll_top: scroller?.scrollTop ?? window.scrollY })
    },
    [mode, feed_key, location.key, location.pathname, location.search],
  )

  return { root_ref, rememberReturn }
}
