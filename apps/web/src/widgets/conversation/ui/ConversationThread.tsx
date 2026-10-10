import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { MessageBubble, conversationKeys, markConversationRead, useMessages } from '@/entities/conversation'
import { useViewer } from '@/entities/session'
import { useRequireSession } from '@/features/login'
import { MessageComposer } from '@/features/send-message'
import { useT } from '@/shared/i18n'
import { Button, CommentIcon, EmptyState, ErrorState, Skeleton } from '@/shared/ui'
import { useConversationLive } from '../model/useConversationLive.ts'

type Peer = { user_id: string; display_name: string }

type ConversationThreadProps = {
  conversation_id: string | null
  peer: Peer | null
  show_back: boolean
}

/** Открытый диалог: подгрузка вверх, поле ввода и отметка прочитанного. */
export function ConversationThread({ conversation_id, peer, show_back }: ConversationThreadProps) {
  const { t } = useT()
  const { viewer } = useViewer()
  const requireSession = useRequireSession()
  const query_client = useQueryClient()
  const messages = useMessages(conversation_id)
  useConversationLive(conversation_id)
  const end_ref = useRef<HTMLDivElement>(null)
  const my_id = viewer.status === 'member' ? viewer.user.id : null
  const items = messages.status === 'ok' ? messages.items : []
  const newest_id = items.at(-1)?.id
  const incoming = items.find((message) => message.sender_id !== my_id && message.read_at === null)

  useEffect(() => {
    end_ref.current?.scrollIntoView({ block: 'nearest' })
  }, [newest_id])

  useEffect(() => {
    if (!conversation_id) return
    let cancelled = false
    void markConversationRead(conversation_id).then(() => {
      if (cancelled) return
      void query_client.invalidateQueries({ queryKey: conversationKeys.unread() })
      void query_client.invalidateQueries({ queryKey: conversationKeys.list() })
    })
    return () => {
      cancelled = true
    }
  }, [conversation_id, incoming?.id, query_client])

  return (
    <section aria-label={peer?.display_name || t('messages.title')} className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2 pb-3">
        {show_back ? (
          <Link to="/messages" className="text-sm text-accent outline-offset-2">
            {t('messages.back')}
          </Link>
        ) : null}
        <h1 className="truncate text-base font-medium">{peer?.display_name || t('messages.title')}</h1>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
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
        {messages.status === 'error' ? <ErrorState title={t('messages.error')} onRetry={messages.refetch} /> : null}
        {messages.status === 'empty' || messages.status === 'idle' ? (
          <EmptyState
            title={t('messages.thread_empty')}
            description={t('messages.thread_empty_hint')}
            icon={<CommentIcon width={28} height={28} />}
          />
        ) : null}
        {items.map((message) => (
          <MessageBubble key={message.id} message={message} is_own={message.sender_id === my_id} />
        ))}
        <div ref={end_ref} />
      </div>
      <MessageComposer conversation_id={conversation_id} peer_user_id={peer?.user_id ?? null} requireSession={requireSession} />
    </section>
  )
}
