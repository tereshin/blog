import { Link } from 'react-router'
import { useT } from '@/shared/i18n'
import { Avatar } from '@/shared/ui'
import { cn } from '@/shared/lib'
import type { ConversationModel } from '../api/conversation-schema.ts'

type ConversationListItemProps = {
  conversation: ConversationModel
  is_selected: boolean
}

/** Строка диалога: аватар, имя, фрагмент, время и число непрочитанных. */
export function ConversationListItem({ conversation, is_selected }: ConversationListItemProps) {
  const { t } = useT()
  const name = conversation.peer.display_name || t('messages.title')
  return (
    <Link
      to={`/messages/${conversation.id}`}
      aria-current={is_selected ? 'page' : undefined}
      className={cn(
        'flex gap-3 rounded-xl px-3 py-2 text-foreground outline-offset-2 hover:bg-surface-secondary',
        is_selected && 'bg-surface-tertiary',
      )}
    >
      <Avatar src={conversation.peer.avatar_url} name={name} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium">{name}</span>
          <span className="shrink-0 text-xs text-muted">{conversation.time_label}</span>
        </span>
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm text-muted">{conversation.last_message_excerpt ?? ''}</span>
          {conversation.unread_count > 0 ? (
            <span className="shrink-0 rounded-pill bg-accent px-1.5 text-xs text-accent-foreground">{conversation.unread_count}</span>
          ) : null}
        </span>
      </span>
    </Link>
  )
}
