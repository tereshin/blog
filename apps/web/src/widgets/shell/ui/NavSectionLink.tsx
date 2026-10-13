import { Link } from 'react-router'
import type { ReactNode } from 'react'
import { NavItemIcon } from '@/entities/nav-section'
import { cn } from '@/shared/lib'

type NavSectionLinkProps = {
  href: string
  is_external: boolean
  is_selected: boolean
  icon: string | null
  children: ReactNode
}

const link_class =
  'flex items-center gap-2.5 rounded-xl px-3 py-2 text-md text-muted outline-offset-2 hover:bg-surface-secondary'

/** Пункт своей секции: внутренняя страница или внешний http(s)-адрес. */
export function NavSectionLink({
  href,
  is_external,
  is_selected,
  icon,
  children,
}: NavSectionLinkProps) {
  const content = (
    <>
      {icon ? (
        <span className={cn('flex shrink-0', is_selected && 'text-[var(--accent)]')}>
          <NavItemIcon svg={icon} size={24} />
        </span>
      ) : null}
      <span className="min-w-0 truncate">{children}</span>
    </>
  )
  const class_name = cn(link_class, is_selected && 'bg-surface-tertiary text-foreground')
  if (is_external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={class_name}>
        {content}
      </a>
    )
  }
  return (
    <Link to={href} aria-current={is_selected ? 'page' : undefined} className={class_name}>
      {content}
    </Link>
  )
}
