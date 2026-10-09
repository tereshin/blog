import { useEffect, useId, useRef } from 'react'
import type { ReactNode, UIEvent } from 'react'
import { useT } from '@/shared/i18n'
import { useMediaQuery } from '@/shared/lib'
import { useShellStore } from '../model/useShellStore.ts'
import { BackToTop } from './BackToTop.tsx'
import { LeftNavDrawer } from './LeftNavDrawer.tsx'

/** Ширина, с которой появляются три колонки (контракт `shell.md`). */
export const WIDE_QUERY = '(min-width: 1200px)'

type ShellProps = {
  header: ReactNode
  left: ReactNode
  center: ReactNode
  right: ReactNode
  /** Меняется при переходе между адресами: центр начинается сверху. */
  scroll_key?: string
}

/**
 * Сетка зон. Шапка вне прокрутки. От 1200px левая и правая карточки неподвижны, прокручивается только центр.
 * Ниже 1200px одна колонка: центр, затем правая карточка; левая открывается панелью с кнопки шапки.
 * Правая колонка никогда не `display: none`: пустая карточка остаётся и держит ширину.
 */
export function Shell({ header, left, center, right, scroll_key }: ShellProps) {
  const { t } = useT()
  const is_wide = useMediaQuery(WIDE_QUERY)
  const is_nav_open = useShellStore((state) => state.is_nav_open)
  const setNavOpen = useShellStore((state) => state.setNavOpen)
  const setCenterScrollTop = useShellStore((state) => state.setCenterScrollTop)

  const column_ref = useRef<HTMLDivElement>(null)
  const center_ref = useRef<HTMLElement>(null)
  const frame_ref = useRef<number | null>(null)
  const latest_top_ref = useRef(0)
  const mount_id = useId()

  useEffect(() => {
    document.documentElement.classList.toggle('shell-lock', is_wide)
    return () => document.documentElement.classList.remove('shell-lock')
  }, [is_wide])

  // Положение центра пишется в стор не чаще кадра: прокрутка не вызывает ре-рендер на каждый пиксель.
  const handleScroll = (event: UIEvent<HTMLElement>) => {
    latest_top_ref.current = event.currentTarget.scrollTop
    if (frame_ref.current !== null) return
    frame_ref.current = requestAnimationFrame(() => {
      frame_ref.current = null
      setCenterScrollTop(latest_top_ref.current)
    })
  }

  useEffect(
    () => () => {
      if (frame_ref.current !== null) cancelAnimationFrame(frame_ref.current)
    },
    [],
  )

  useEffect(() => {
    column_ref.current?.scrollTo({ top: 0 })
    center_ref.current?.scrollTo({ top: 0 })
    setCenterScrollTop(0)
  }, [scroll_key, setCenterScrollTop])

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header role="banner" data-mount-id={mount_id} className="shrink-0">
        {header}
      </header>
      <div
        ref={column_ref}
        data-shell-scroll="column"
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain min-[1200px]:grid min-[1200px]:grid-cols-[16rem_minmax(0,1fr)_21rem] min-[1200px]:gap-4 min-[1200px]:overflow-hidden min-[1200px]:px-4 min-[1200px]:pb-4"
      >
        <nav aria-label={t('shell.navigation')} className="hidden h-full min-h-0 min-[1200px]:block">
          {is_wide ? left : null}
        </nav>
        <main
          ref={center_ref}
          data-shell-scroll="center"
          onScroll={handleScroll}
          className="min-w-0 min-[1200px]:min-h-0 min-[1200px]:overflow-y-auto min-[1200px]:overscroll-contain"
        >
          {center}
        </main>
        <aside
          aria-label={t('shell.popular_comments')}
          className="min-w-0 px-4 pb-4 min-[1200px]:flex min-[1200px]:min-h-0 min-[1200px]:max-h-full min-[1200px]:flex-col min-[1200px]:p-0"
        >
          {right}
        </aside>
      </div>
      <BackToTop />
      <LeftNavDrawer is_open={!is_wide && is_nav_open} onOpenChange={setNavOpen}>
        {left}
      </LeftNavDrawer>
    </div>
  )
}
