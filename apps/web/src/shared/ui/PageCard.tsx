import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/shared/lib'
import { Card } from './Card.tsx'

type PageCardHeaderProps = Omit<ComponentProps<typeof Card.Header>, 'title'> & {
  title: ReactNode
  actions?: ReactNode
  heading_level?: 1 | 2
}

function PageCardHeader({
  title,
  actions,
  heading_level = 1,
  className,
  children,
  ...rest
}: PageCardHeaderProps) {
  const Heading = heading_level === 1 ? 'h1' : 'h2'
  return (
    <Card.Header
      className={cn(
        'flex flex-row items-center justify-between gap-3 border-b border-separator px-4 py-4 sm:px-6',
        className,
      )}
      {...rest}
    >
      <Heading className="min-w-0 break-words text-lg font-semibold">{title}</Heading>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      {children}
    </Card.Header>
  )
}

function PageCardContent({ className, ...rest }: ComponentProps<typeof Card.Content>) {
  return <Card.Content className={cn('min-w-0 px-4 py-6 sm:px-6', className)} {...rest} />
}

function PageCardFooter({ className, ...rest }: ComponentProps<typeof Card.Footer>) {
  return (
    <Card.Footer
      className={cn('flex flex-wrap gap-3 border-t border-separator px-4 py-4 sm:px-6', className)}
      {...rest}
    />
  )
}

function PageCardRoot(props: ComponentProps<typeof Card>) {
  return <Card {...props} />
}

export const PageCard = Object.assign(PageCardRoot, {
  Header: PageCardHeader,
  Content: PageCardContent,
  Footer: PageCardFooter,
})
