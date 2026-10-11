import { cn } from '@/shared/lib'
import type { MessageModel } from '../api/conversation-schema.ts'

type MessageBubbleProps = {
  message: MessageModel
  is_own: boolean
}

/** Пузырь сообщения: своё справа, чужое слева, под ним время. */
export function MessageBubble({ message, is_own }: MessageBubbleProps) {
  return (
    <div
      className={cn(
        'flex max-w-[85%] shrink-0 flex-col gap-1.5 min-[768px]:max-w-[80%]',
        is_own ? 'ml-auto items-end' : 'mr-auto items-start',
      )}
    >
      <p
        className={cn(
          'whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed [overflow-wrap:anywhere]',
          is_own
            ? 'rounded-br-md bg-accent/15 text-foreground'
            : 'rounded-bl-md bg-surface-secondary text-foreground',
        )}
      >
        {message.body}
      </p>
      <time dateTime={message.created_at} className="text-xs text-muted">
        {message.time_label}
      </time>
    </div>
  )
}
