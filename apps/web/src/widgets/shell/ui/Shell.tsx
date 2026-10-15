import { useId } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import { useShellLayout } from '../model/useShellLayout.ts'
import { BackToTop } from './BackToTop.tsx'

type ShellProps = {
  content_width?: 640 | 848
  header: ReactNode
  left: ReactNode
  center: ReactNode
  right: ReactNode
  /** Меняется при переходе между адресами: документ начинается сверху. */
  scroll_key?: string
}

/** Общая сетка шапки и main: центр 640px по умолчанию или 848px. */
export function Shell({
  header,
  left,
  center,
  right,
  scroll_key,
  content_width = 640,
}: ShellProps) {
  const { t } = useT()
  useShellLayout(scroll_key)
  const mount_id = useId()

  const show_rail = right != null && right !== false
  return (
    <div
      className={`min-h-dvh bg-background text-foreground${show_rail ? '' : ' shell-no-rail'}`}
      style={{ '--shell-content-width': `${content_width}px` } as CSSProperties}
    >
      <header
        role="banner"
        data-mount-id={mount_id}
        className="site-header sticky top-0 z-20 h-14"
      >
        {header}
      </header>
      <div className="shell-grid">
        <nav
          aria-label={t('shell.navigation')}
          data-shell-scroll="left"
          className="sticky pt-2 top-14 hidden max-h-[calc(100dvh-56px)] self-start overflow-y-auto min-[768px]:block"
        >
          {left}
        </nav>
        <main className="min-w-0 pt-4 pb-[var(--tab-bar-space)]">{center}</main>
        {show_rail ? (
          <aside
            aria-label={t('shell.popular_comments')}
            className="sticky pt-4 top-14 hidden w-[320px] max-h-[calc(100dvh-56px)] self-start overflow-y-auto min-[1280px]:block"
          >
            {right}
          </aside>
        ) : null}
      </div>
      <BackToTop />
    </div>
  )
}
