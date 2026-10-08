import { Link } from 'react-router'
import { Avatar } from '@/shared/ui'
import type { UserListItemModel } from '../model/user-types.ts'

type UserListItemProps = { user: UserListItemModel }

function reputationLabel(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
  return safe === 0 ? '0' : `+${safe}`
}

/** Строка списка людей: аватар, имя ведёт в профиль, репутация зелёным. */
export function UserListItem({ user }: UserListItemProps) {
  return (
    <li className="flex items-center gap-3 py-2">
      <Link to={user.href} className="shrink-0 rounded-avatar outline-offset-2" aria-label={user.display_name}>
        <Avatar src={user.avatar_url} name={user.display_name} size="sm" />
      </Link>
      <Link to={user.href} className="min-w-0 flex-1 truncate text-sm font-medium outline-offset-2 hover:underline">
        {user.display_name}
      </Link>
      <span className="text-sm font-medium text-positive">{reputationLabel(user.reputation)}</span>
    </li>
  )
}