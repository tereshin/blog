import { useCallback, useMemo } from 'react'
import { MessageBubble } from '@/entities/conversation'
import { MessageComposer } from '@/features/send-message'
import { useT } from '@/shared/i18n'
import {
  Avatar,
  BaseIcon,
  Button,
  Card,
  CommentIcon,
  EmptyState,
  ErrorState,
  Skeleton,
  Tooltip,
  VirtualList,
} from '@/shared/ui'
import { useConversationThread } from '../model/useConversationThread.ts'

type Peer = { user_id: string; display_name: string; avatar_url?: string | null }

type ConversationThreadProps = {
  conversation_id: string | null
  peer: Peer | null
}

const VIRTUALIZATION_THRESHOLD = 50

/** Открытый диалог: подгрузка вверх, поле ввода и отметка прочитанного. */
export function ConversationThread({ conversation_id, peer }: ConversationThreadProps) {
  const { t } = useT()
  const { messages, items, my_id, end_ref, requireSession, navigate } =
    useConversationThread(conversation_id)
  const message_by_id = useMemo(() => new Map(items.map((message) => [message.id, message])), [items])
  const ids = items.map((message) => message.id)
  const handleNearEnd = useCallback(() => {
    if (messages.status === 'ok' && messages.has_next) messages.fetchNext()
  }, [messages])

  return (
    <Card
      role="region"
      aria-label={peer?.display_name || t('messages.title')}
      className="flex min-h-0 w-full flex-1 flex-col gap-0 overflow-hidden"
    >
      <Card.Header className="flex shrink-0 flex-row items-center gap-3 border-b border-separator px-4 py-4">
        <Tooltip>
          <Button
            isIconOnly
            variant="ghost"
            aria-label={t('messages.back')}
            onPress={() => void navigate('/messages')}
          >
            <BaseIcon name="left" style="line" className="size-6 text-muted" size={28} />
          </Button>
          <Tooltip.Content>{t('messages.back')}</Tooltip.Content>
        </Tooltip>
        <Avatar
          src={peer?.avatar_url}
          name={peer?.display_name || t('messages.title')}
          size="sm"
          className="shrink-0"
        />
        <h1 className="min-w-0 truncate text-base font-semibold">
          {peer?.display_name || t('messages.title')}
        </h1>
      </Card.Header>
      <Card.Content className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-5 min-[768px]:px-5">
        {messages.status === 'ok' && messages.has_next ? (
          <Button variant="ghost" size="sm" className="self-center" onPress={messages.fetchNext}>
            {t('messages.load_earlier')}
          </Button>
        ) : null}
        {messages.status === 'loading' ? (
          <div role="status" aria-label={t('common.loading')} className="flex flex-col gap-2">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="ml-auto h-10 w-1/2" />
          </div>
        ) : null}
        {messages.status === 'error' ? (
          <ErrorState title={t('messages.error')} onRetry={messages.refetch} />
        ) : null}
        {messages.status === 'empty' || messages.status === 'idle' ? (
          <EmptyState
            title={t('messages.thread_empty')}
            description={t('messages.thread_empty_hint')}
            icon={<CommentIcon width={28} height={28} />}
            className="my-auto min-h-0 rounded-none bg-transparent px-0 py-6 shadow-none"
          />
        ) : null}
        {ids.length > VIRTUALIZATION_THRESHOLD ? (
          <VirtualList
            ids={ids}
            estimate_size={64}
            onNearEnd={handleNearEnd}
            item_className="pb-2"
            renderItem={(id) => {
              const message = message_by_id.get(id)
              return message ? (
                <MessageBubble message={message} is_own={message.sender_id === my_id} />
              ) : null
            }}
          />
        ) : (
          items.map((message) => (
            <MessageBubble key={message.id} message={message} is_own={message.sender_id === my_id} />
          ))
        )}
        <div ref={end_ref} />
      </Card.Content>
      <Card.Footer className="shrink-0 border-t border-separator px-4 py-3 min-[768px]:px-5">
        <MessageComposer
          conversation_id={conversation_id}
          peer_user_id={peer?.user_id ?? null}
          requireSession={requireSession}
          onSent={(message) => {
            if (!conversation_id)
              void navigate(`/messages/${message.conversation_id}`, {
                replace: true,
                state: { peer },
              })
          }}
        />
      </Card.Footer>
    </Card>
  )
}
