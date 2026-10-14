import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Avatar } from '@/shared/ui'

type DiscoveryRowProps = {
  href: string
  name: string
  slug: string
  avatar_url: string | null
  rank?: number
  action?: ReactNode
}

export function DiscoveryRow({ href, name, slug, avatar_url, rank, action }: DiscoveryRowProps) {
  return (
    <div className="flex min-h-20 items-center gap-3 py-3">
      {rank !== undefined ? (
        <span className="w-7 shrink-0 text-center tabular-nums">{rank}</span>
      ) : null}
      <Link to={href} className="shrink-0 rounded-avatar outline-offset-2" aria-label={name}>
        <Avatar src={avatar_url} name={name} size="md" />
      </Link>
      <Link to={href} className="min-w-0 flex-1 rounded-sm outline-offset-2 hover:underline">
        <span className="block truncate text-base font-semibold">{name}</span>
        <span className="block truncate text-sm text-muted">@{slug}</span>
      </Link>
      {action}
    </div>
  )
}
