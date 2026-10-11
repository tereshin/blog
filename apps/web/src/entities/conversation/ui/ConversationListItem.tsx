import { Link } from 'react-router'
import { useT } from '@/shared/i18n'
import { Avatar, Chip } from '@/shared/ui'
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
        'flex items-center gap-3 rounded-xl px-3 py-4 text-foreground outline-offset-2 transition-colors hover:bg-surface-secondary focus-visible:bg-surface-secondary',
        is_selected && 'bg-surface-tertiary',
      )}
    >
      <Avatar src={conversation.peer.avatar_url} name={name} size="md" className="shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              'truncate text-base',
              conversation.unread_count > 0 ? 'font-semibold' : 'font-medium',
            )}
          >
            {name}
          </span>
          <time
            dateTime={conversation.last_message_at ?? undefined}
            className="shrink-0 text-xs text-muted"
          >
            {conversation.time_label}
          </time>
        </span>
        <span className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'truncate text-sm',
              conversation.unread_count > 0 ? 'text-foreground' : 'text-muted',
            )}
          >
            {conversation.last_message_excerpt ?? ''}
          </span>
          {conversation.unread_count > 0 ? (
            <Chip
              size="sm"
              className="h-5 min-w-5 shrink-0 justify-center bg-accent px-1.5 text-xs text-accent-foreground"
            >
              {conversation.unread_count}
            </Chip>
          ) : null}
        </span>
      </span>
    </Link>
  )
}
