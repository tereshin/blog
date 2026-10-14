import type { ReactNode } from 'react'
import { BaseIcon } from '@/shared/ui'

type NavSectionProps = {
  title: string
  is_expanded: boolean
  onToggle: () => void
  header_action?: ReactNode
  children: ReactNode
}

/** Сворачиваемая группа сайдбара. Стрелка видна при наведении и фокусе с клавиатуры. */
export function NavSection({
  title,
  is_expanded,
  onToggle,
  header_action,
  children,
}: NavSectionProps) {
  const arrow_class = 'shrink-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
  return (
    <section aria-label={title} className="flex flex-col gap-1 pt-3">
      <div className="flex items-center justify-between gap-2 px-3">
        <button
          type="button"
          className="group flex min-w-0 flex-1 items-center gap-1 rounded-lg py-1 text-left text-base text-muted outline-offset-2 hover:text-foreground"
          aria-expanded={is_expanded}
          onClick={onToggle}
        >
          <span className="truncate">{title}</span>
          {is_expanded ? (
            <BaseIcon name="down" style="line" size={16} aria-hidden="true" className={arrow_class} />
          ) : (
            <BaseIcon name="right" style="line" size={16} aria-hidden="true" className={arrow_class} />
          )}
        </button>
        {header_action}
      </div>
      {is_expanded ? children : null}
    </section>
  )
}
