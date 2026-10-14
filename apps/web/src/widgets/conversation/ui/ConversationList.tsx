import { useCallback, useMemo, useState } from 'react'
import { ConversationListItem, useConversations } from '@/entities/conversation'
import { useViewer } from '@/entities/session'
import { useT } from '@/shared/i18n'
import {
  Button,
  Card,
  CommentIcon,
  EmptyState,
  ErrorState,
  PenIcon,
  Skeleton,
  Tooltip,
  VirtualList,
} from '@/shared/ui'
import { PeerPicker } from './PeerPicker.tsx'

const VIRTUALIZATION_THRESHOLD = 100

type ConversationListProps = {
  selected_id: string | null
}

/** Список диалогов и кнопка нового сообщения. */
export function ConversationList({ selected_id }: ConversationListProps) {
  const { t } = useT()
  const { viewer } = useViewer()
  const conversations = useConversations(viewer.status === 'member')
  const [is_picker_open, setPickerOpen] = useState(false)
  const items = useMemo(
    () => (conversations.status === 'ok' ? conversations.items : []),
    [conversations],
  )
  const conversation_by_id = useMemo(
    () => new Map(items.map((conversation) => [conversation.id, conversation])),
    [items],
  )
  const ids = items.map((conversation) => conversation.id)
  const handleNearEnd = useCallback(() => {
    if (conversations.status === 'ok' && conversations.has_next) conversations.fetchNext()
  }, [conversations])

  return (
    <Card
      role="region"
      aria-label={t('messages.title')}
      className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden"
    >
      <Card.Header className="flex shrink-0 flex-row items-center justify-between gap-3 border-b border-separator px-5 py-4">
        <h1 className="text-xl font-semibold tracking-tight">{t('messages.title')}</h1>
        <Tooltip>
          <Button
            isIconOnly
            variant="secondary"
            aria-label={t('messages.new')}
            onPress={() => setPickerOpen(true)}
          >
            <PenIcon />
          </Button>
          <Tooltip.Content>{t('messages.new')}</Tooltip.Content>
        </Tooltip>
      </Card.Header>
      <Card.Content className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        {conversations.status === 'loading' ? (
          <div className="flex flex-col gap-2" role="status" aria-label={t('common.loading')}>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : null}
        {conversations.status === 'error' ? (
          <ErrorState title={t('messages.error')} onRetry={conversations.refetch} />
        ) : null}
        {conversations.status === 'empty' ? (
          <EmptyState
            title={t('messages.empty')}
            description={t('messages.empty_hint')}
            icon={<CommentIcon width={28} height={28} />}
            className="py-8"
          />
        ) : null}
        {conversations.status === 'ok' && ids.length > VIRTUALIZATION_THRESHOLD ? (
          <VirtualList
            ids={ids}
            estimate_size={80}
            onNearEnd={handleNearEnd}
            item_className="pb-1"
            renderItem={(id) => {
              const conversation = conversation_by_id.get(id)
              return conversation ? (
                <ConversationListItem
                  conversation={conversation}
                  is_selected={conversation.id === selected_id}
                />
              ) : null
            }}
          />
        ) : null}
        {conversations.status === 'ok' && ids.length <= VIRTUALIZATION_THRESHOLD ? (
          <ul className="flex flex-col gap-1">
            {items.map((conversation) => (
              <li key={conversation.id}>
                <ConversationListItem
                  conversation={conversation}
                  is_selected={conversation.id === selected_id}
                />
              </li>
            ))}
            {conversations.has_next ? (
              <li>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onPress={conversations.fetchNext}
                >
                  {t('common.show_all')}
                </Button>
              </li>
            ) : null}
          </ul>
        ) : null}
      </Card.Content>
      {is_picker_open ? <PeerPicker is_open onOpenChange={setPickerOpen} /> : null}
    </Card>
  )
}
