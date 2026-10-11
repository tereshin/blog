import { Link } from 'react-router'
import type { ReactNode } from 'react'
import { cn } from '@/shared/lib'

type LeftNavItemProps = {
  to: string
  is_selected: boolean
  /** Признак «есть новое» справа от названия (непрочитанные сообщения). */
  has_unread?: boolean
  unread_label?: string
  /** Декоративная иконка слева от названия. */
  icon?: ReactNode
  children: ReactNode
  onPress?: () => void
}

/** Пункт режима в левой карточке: подложка и `aria-current` вместе, чтобы выбор был не только цветом. */
export function LeftNavItem({ to, is_selected, has_unread = false, unread_label, icon, children, onPress }: LeftNavItemProps) {
  return (
    <Link
      to={to}
      onClick={onPress}
      aria-current={is_selected ? 'page' : undefined}
      className={cn(
        'flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-md text-muted outline-offset-2 hover:bg-surface-secondary',
        is_selected && 'bg-surface-tertiary text-foreground',
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        {icon ? <span className={cn('flex shrink-0', is_selected && 'text-[var(--accent)]')} >{icon}</span> : null}
        <span className="min-w-0 truncate">{children}</span>
      </span>
      {has_unread ? (
        <span role="img" aria-label={unread_label} className="size-2 shrink-0 rounded-avatar bg-accent" />
      ) : null}
    </Link>
  )
}
