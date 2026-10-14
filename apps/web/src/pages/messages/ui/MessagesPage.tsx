import { lazy } from 'react'
import { useT } from '@/shared/i18n'
import { Button, CommentIcon, EmptyState } from '@/shared/ui'
import { useMessagesPage } from '../model/useMessagesPage.ts'

const ConversationList = lazy(() =>
  import('@/widgets/conversation').then((module) => ({ default: module.ConversationList })),
)
const ConversationThread = lazy(() =>
  import('@/widgets/conversation').then((module) => ({ default: module.ConversationThread })),
)

export default function MessagesPage() {
  const { t } = useT()
  const { viewer, openLogin, conversation_id, peer, show_thread, to } = useMessagesPage()

  if (viewer.status === 'loading') return null

  if (viewer.status === 'guest') {
    return (
      <EmptyState
        title={t('messages.sign_in')}
        description={t('messages.sign_in_hint')}
        icon={<CommentIcon width={28} height={28} />}
        className="py-16"
      >
        <Button variant="primary" size="lg" onPress={() => openLogin('required')}>
          {t('header.sign_in')}
        </Button>
      </EmptyState>
    )
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-5.5rem-var(--tab-bar-space))] min-h-0 w-full max-w-[var(--shell-content-width,640px)] flex-col px-3 min-[768px]:px-0">
      {show_thread && peer ? (
        <ConversationThread
          key={conversation_id ?? to}
          conversation_id={conversation_id}
          peer={peer}
        />
      ) : (
        <ConversationList selected_id={conversation_id} />
      )}
    </div>
  )
}
