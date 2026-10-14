import { useEffect } from 'react'
import { useShellStore } from './useShellStore.ts'

export function useShellLayout(scroll_key?: string) {
  const is_nav_open = useShellStore((state) => state.is_nav_open)
  const setNavOpen = useShellStore((state) => state.setNavOpen)
  const setCenterScrollTop = useShellStore((state) => state.setCenterScrollTop)

  useEffect(() => {
    const onScroll = () => setCenterScrollTop(window.scrollY)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [setCenterScrollTop])

  useEffect(() => {
    window.scrollTo({ top: 0 })
    setCenterScrollTop(0)
  }, [scroll_key, setCenterScrollTop])

  return { is_nav_open, setNavOpen }
}
