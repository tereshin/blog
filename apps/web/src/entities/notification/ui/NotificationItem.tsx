import { Link } from 'react-router'
import { useT } from '@/shared/i18n'
import type { MessageKey } from '@/shared/i18n'
import { formatTime } from '@/shared/lib'
import { Avatar } from '@/shared/ui'
import { cn } from '@/shared/lib'
import type { NotificationModel } from '../api/notification-schema.ts'

const KIND_KEY: Record<NotificationModel['kind'], MessageKey> = {
  comment: 'notification.comment',
  reply: 'notification.reply',
  mention: 'notification.mention',
  reaction: 'notification.reaction',
  message: 'notification.message',
  moderation: 'notification.moderation',
}

type NotificationItemProps = {
  item: NotificationModel
  onOpen?: (item: NotificationModel) => void
}

/** Строка уведомления: аватар, текст по виду, время. Непрочитанное выделено. */
export function NotificationItem({ item, onOpen }: NotificationItemProps) {
  const { t } = useT()
  const unread = item.read_at === null
  return (
    <Link
      to={item.href}
      onClick={() => onOpen?.(item)}
      className={cn('flex gap-3 rounded-xl px-3 py-2 text-foreground outline-offset-2 hover:bg-surface-secondary', unread && 'bg-surface-secondary')}
    >
      <Avatar src={item.actor.avatar_url} name={item.actor.display_name || t('comment.author_unknown')} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm">
          {t(KIND_KEY[item.kind], { name: item.actor.display_name, title: item.article_title ?? '' })}
        </span>
        <span className="text-xs text-muted">{formatTime(item.created_at)}</span>
      </span>
    </Link>
  )
}
