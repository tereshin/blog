import { cn } from '@/shared/lib'
import type { MessageModel } from '../api/conversation-schema.ts'

type MessageBubbleProps = {
  message: MessageModel
  is_own: boolean
}

/** Пузырь сообщения: своё справа, чужое слева, под ним время. */
export function MessageBubble({ message, is_own }: MessageBubbleProps) {
  return (
    <div className={cn('flex max-w-[80%] flex-col gap-1', is_own ? 'ml-auto items-end' : 'mr-auto items-start')}>
      <p
        className={cn(
          'whitespace-pre-wrap rounded-xl px-3 py-2 text-sm',
          is_own ? 'bg-accent text-accent-foreground' : 'bg-surface-secondary text-foreground',
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
