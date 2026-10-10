import type { ReactNode } from 'react'
import { cn } from '@/shared/lib'
import { Card } from './Card.tsx'
import { InboxIcon } from './icons.tsx'

type EmptyStateProps = {
  title: string
  description?: string
  /** Значок над заголовком. */
  icon?: ReactNode
  /** Действия под текстом: кнопка входа, ссылка. */
  children?: ReactNode
  className?: string
}

export function EmptyState({ title, description, icon, children, className }: EmptyStateProps) {
  return (
    <Card className={cn('min-h-56 w-full items-center justify-center gap-3 px-6 py-12 text-center', className)}>
      <div aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-muted">
        {icon ?? <InboxIcon width={28} height={28} />}
      </div>
      <div className="flex max-w-sm flex-col gap-2">
        <p className="text-base font-semibold text-foreground">{title}</p>
        {description ? <p className="text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {children ? <div className="mt-1 flex flex-wrap justify-center gap-2">{children}</div> : null}
    </Card>
  )
}
