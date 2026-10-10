import { useEffect, useId } from 'react'
import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import { useShellStore } from '../model/useShellStore.ts'
import { BackToTop } from './BackToTop.tsx'
import { LeftNavDrawer } from './LeftNavDrawer.tsx'

type ShellProps = {
  header: ReactNode
  left: ReactNode
  center: ReactNode
  right: ReactNode
  /** Меняется при переходе между адресами: документ начинается сверху. */
  scroll_key?: string
}

/**
 * Полоса 1280 по центру от этой ширины. Прокручивается документ.
 * Шапка и видимые столбцы липнут к окну. Правый столбец есть только от 1280px.
 * От 768px левый столбец остаётся. Ниже 768px одна колонка, левая навигация — из шапки.
 * Видимость столбцов задаёт CSS, не скрипт после гидрации.
 */
export function Shell({ header, left, center, right, scroll_key }: ShellProps) {
  const { t } = useT()
  const is_nav_open = useShellStore((state) => state.is_nav_open)
  const setNavOpen = useShellStore((state) => state.setNavOpen)
  const setCenterScrollTop = useShellStore((state) => state.setCenterScrollTop)
  const mount_id = useId()

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

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header role="banner" data-mount-id={mount_id} className="sticky top-0 z-20 h-14 bg-[var(--surface)]">
        {header}
      </header>
      <div className="mx-auto w-full min-[768px]:grid min-[768px]:grid-cols-[220px_minmax(0,1fr)] min-[768px]:gap-x-4 min-[1280px]:w-[1280px] min-[1280px]:grid-cols-[220px_minmax(0,1fr)_320px]">
        <nav
          aria-label={t('shell.navigation')}
          data-shell-scroll="left"
          className="sticky pt-2 top-14 hidden max-h-[calc(100dvh-56px)] self-start overflow-y-auto min-[768px]:block"
        >
          {left}
        </nav>
        <main className="min-w-0 pt-4">{center}</main>
        <aside
          aria-label={t('shell.popular_comments')}
          className="sticky pt-4 top-14 hidden w-[320px] max-h-[calc(100dvh-56px)] self-start overflow-y-auto min-[1280px]:block"
        >
          {right}
        </aside>
      </div>
      <BackToTop />
      <LeftNavDrawer is_open={is_nav_open} onOpenChange={setNavOpen}>
        {left}
      </LeftNavDrawer>
    </div>
  )
}
