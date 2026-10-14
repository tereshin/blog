import { useCallback, useEffect, useRef } from 'react'
import type { MouseEvent } from 'react'
import type { FeedMode } from '@/entities/article'
import { findScrollParent, readFeedReturn, saveFeedReturn } from '@/shared/lib'

export function useFeedReturn(mode: FeedMode, feed_key: string, is_ready: boolean) {
  const root_ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = readFeedReturn()
    if (!is_ready || !saved || saved.mode !== mode) return
    const frame = requestAnimationFrame(() => {
      const scroller = findScrollParent(root_ref.current)
      if (scroller) scroller.scrollTo({ top: saved.scroll_top })
      else window.scrollTo({ top: saved.scroll_top })
    })
    return () => cancelAnimationFrame(frame)
  }, [mode, is_ready])

  const rememberReturn = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const link = event.target instanceof Element ? event.target.closest('a') : null
      const href = link?.getAttribute('href') ?? ''
      if (!href.startsWith('/p/') || href.includes('#')) return
      const scroller = findScrollParent(root_ref.current)
      saveFeedReturn({ mode, feed_key, scroll_top: scroller?.scrollTop ?? window.scrollY })
    },
    [mode, feed_key],
  )

  return { root_ref, rememberReturn }
}
