import type { ReactNode } from 'react'
import { cn } from '@/shared/lib'

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
    <div className={cn('flex flex-col items-center gap-2 px-4 py-10 text-center', className)}>
      {icon ? <div className="text-muted">{icon}</div> : null}
      <p className="text-base font-medium text-foreground">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted">{description}</p> : null}
      {children ? <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div> : null}
    </div>
  )
}
