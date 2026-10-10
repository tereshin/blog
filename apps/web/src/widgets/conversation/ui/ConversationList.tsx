import { useState } from 'react'
import { ConversationListItem, useConversations } from '@/entities/conversation'
import { useViewer } from '@/entities/session'
import { useT } from '@/shared/i18n'
import { Button, CommentIcon, EmptyState, ErrorState, Skeleton } from '@/shared/ui'
import { PeerPicker } from './PeerPicker.tsx'

type ConversationListProps = {
  selected_id: string | null
}

/** Список диалогов и кнопка нового сообщения. */
export function ConversationList({ selected_id }: ConversationListProps) {
  const { t } = useT()
  const { viewer } = useViewer()
  const conversations = useConversations(viewer.status === 'member')
  const [is_picker_open, setPickerOpen] = useState(false)

  return (
    <section aria-label={t('messages.title')} className="flex min-h-0 flex-col gap-2">
      <Button variant="secondary" onPress={() => setPickerOpen(true)}>
        {t('messages.new')}
      </Button>
      {conversations.status === 'loading' ? (
        <div className="flex flex-col gap-2" role="status" aria-label={t('common.loading')}>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : null}
      {conversations.status === 'error' ? <ErrorState title={t('messages.error')} onRetry={conversations.refetch} /> : null}
      {conversations.status === 'empty' ? <EmptyState title={t('messages.empty')} description={t('messages.empty_hint')} icon={<CommentIcon width={28} height={28} />} className="py-8" /> : null}
      {conversations.status === 'ok' ? (
        <ul className="flex min-h-0 flex-col gap-1 overflow-y-auto">
          {conversations.items.map((conversation) => (
            <li key={conversation.id}>
              <ConversationListItem conversation={conversation} is_selected={conversation.id === selected_id} />
            </li>
          ))}
          {conversations.has_next ? (
            <li>
              <Button variant="ghost" size="sm" onPress={conversations.fetchNext}>
                {t('common.show_all')}
              </Button>
            </li>
          ) : null}
        </ul>
      ) : null}
      <PeerPicker is_open={is_picker_open} onOpenChange={setPickerOpen} />
    </section>
  )
}
