import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { useShellStore } from './useShellStore.ts'

export function useShellLayout(scroll_key?: string) {
  const location = useLocation()
  const is_editor = /^\/(?:write(?:\/|$)|admin\/pages\/(?:new|[^/]+)\/?$)/.test(location.pathname)
  const previous_ref = useRef({ path: scroll_key, is_editor: false })
  const setCenterScrollTop = useShellStore((state) => state.setCenterScrollTop)

  useEffect(() => {
    const onScroll = () => setCenterScrollTop(window.scrollY)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [setCenterScrollTop])

  useLayoutEffect(() => {
    const previous = history.scrollRestoration
    history.scrollRestoration = 'manual'
    return () => { history.scrollRestoration = previous }
  }, [])

  useLayoutEffect(() => {
    const previous = previous_ref.current
    previous_ref.current = { path: scroll_key, is_editor }
    if (is_editor || (previous.is_editor && previous.path === scroll_key)) return
    window.scrollTo({ top: 0, behavior: 'instant' })
    setCenterScrollTop(0)
  }, [scroll_key, location.key, is_editor, setCenterScrollTop])
}
