import type { ReactNode } from 'react'
import { cn } from '@/shared/lib'
import { Avatar } from './Avatar.tsx'
import { Card } from './Card.tsx'
import { Skeleton } from './Skeleton.tsx'

type IdentityHeaderProps = { children: ReactNode }
type CoverProps = { url?: string | null; action?: ReactNode }
type IdentityProps = { avatar: ReactNode; actions?: ReactNode }

function Root({ children }: IdentityHeaderProps) {
  return <Card className="identity-header gap-0 overflow-hidden">{children}</Card>
}

function Cover({ url, action }: CoverProps) {
  return (
    <div className="group relative aspect-[3.2/1] min-h-28 w-full bg-surface-tertiary">
      {url ? <img src={url} alt="" className="absolute inset-0 size-full object-cover" /> : null}
      {action ? (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center px-4',
            url &&
              'opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100',
          )}
        >
          {action}
        </div>
      ) : null}
    </div>
  )
}

function AvatarBlock({ src, name }: { src?: string | null; name: string }) {
  return (
    <Avatar
      src={src}
      name={name}
      className="relative -mt-12 size-20 shrink-0 ring-4 ring-surface sm:-mt-14 sm:size-24"
    />
  )
}

function Identity({ avatar, actions }: IdentityProps) {
  return (
    <div className="relative flex flex-wrap items-end gap-x-4 gap-y-3 px-5 pt-4 sm:px-6">
      {avatar}
      {actions ? (
        <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  )
}

function Content({ children }: IdentityHeaderProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">{children}</div>
  )
}

function Navigation({ children }: IdentityHeaderProps) {
  return <div className="px-5 sm:px-6">{children}</div>
}

function Loading() {
  return (
    <Root>
      <Skeleton className="aspect-[3.2/1] min-h-28 w-full rounded-none" />
      <Identity
        avatar={
          <Skeleton
            shape="circle"
            className="relative -mt-12 size-20 ring-4 ring-surface sm:-mt-14 sm:size-24"
          />
        }
      />
      <Content>
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-4/5" />
      </Content>
      <Navigation>
        <Skeleton className="mb-4 h-8 w-48" />
      </Navigation>
    </Root>
  )
}

/** Общий визуальный каркас страницы с обложкой; данные и действия передаются слотами. */
export const IdentityHeader = Object.assign(Root, {
  Cover,
  Avatar: AvatarBlock,
  Identity,
  Content,
  Navigation,
  Skeleton: Loading,
})
