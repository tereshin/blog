import { lazy, useEffect } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { useConversations } from '@/entities/conversation'
import { useViewer } from '@/entities/session'
import { useLoginDialog } from '@/features/login'
import { useT } from '@/shared/i18n'
import { useMediaQuery } from '@/shared/lib'
import { Button, EmptyState } from '@/shared/ui'
import { useShellStore } from '@/widgets/shell'

// Гость видит только просьбу войти: список и поле подгружаются, когда зритель уже участник.
const ConversationList = lazy(() => import('@/widgets/conversation').then((module) => ({ default: module.ConversationList })))
const ConversationThread = lazy(() => import('@/widgets/conversation').then((module) => ({ default: module.ConversationThread })))

const SPLIT_QUERY = '(min-width: 768px)'

type PeerState = { user_id: string; display_name: string }

function isPeerState(value: unknown): value is { peer: PeerState } {
  if (!value || typeof value !== 'object') return false
  const peer = (value as { peer?: unknown }).peer
  if (!peer || typeof peer !== 'object') return false
  const record = peer as { user_id?: unknown; display_name?: unknown }
  return typeof record.user_id === 'string' && typeof record.display_name === 'string'
}

export default function MessagesPage() {
  const { t } = useT()
  const { viewer } = useViewer()
  const openLogin = useLoginDialog((state) => state.open)
  const setHeaderCenter = useShellStore((state) => state.setHeaderCenter)
  const is_split = useMediaQuery(SPLIT_QUERY)
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const [params] = useSearchParams()
  const to = params.get('to')
  const is_member = viewer.status === 'member'
  const conversations = useConversations(is_member)
  const conversation_id = id ?? null
  const listed =
    conversations.status === 'ok'
      ? conversations.items.find((item) => item.id === conversation_id || (to !== null && item.peer.user_id === to))
      : undefined
  const from_state = isPeerState(location.state) ? location.state.peer : null
  const peer = listed
    ? { user_id: listed.peer.user_id, display_name: listed.peer.display_name }
    : from_state
      ? from_state
      : to
        ? { user_id: to, display_name: '' }
        : conversation_id
          ? { user_id: '', display_name: '' }
          : null
  const show_thread = Boolean(conversation_id || to)
  const existing_id =
    to && conversations.status === 'ok' ? conversations.items.find((item) => item.peer.user_id === to)?.id : undefined

  useEffect(() => {
    setHeaderCenter({ kind: 'empty' })
  }, [setHeaderCenter])

  useEffect(() => {
    if (to && existing_id) void navigate(`/messages/${existing_id}`, { replace: true })
  }, [existing_id, navigate, to])

  if (viewer.status === 'loading') return null

  if (viewer.status === 'guest') {
    return (
      <EmptyState title={t('messages.sign_in')} className="py-16">
        <Button variant="primary" onPress={() => openLogin('required')}>
          {t('header.sign_in')}
        </Button>
      </EmptyState>
    )
  }

  return (
    <div className="flex h-[calc(100dvh-5.5rem)] min-h-0 flex-col gap-4 p-4 min-[768px]:grid min-[768px]:grid-cols-[18rem_minmax(0,1fr)] min-[768px]:p-0">
      {is_split || !show_thread ? <ConversationList selected_id={conversation_id} /> : null}
      {is_split || show_thread ? (
        show_thread && peer ? (
          <ConversationThread conversation_id={conversation_id} peer={peer} show_back={!is_split} />
        ) : (
          <EmptyState title={t('messages.pick')} className="py-16" />
        )
      ) : null}
    </div>
  )
}
