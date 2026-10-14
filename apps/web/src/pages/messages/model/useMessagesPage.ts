import { useEffect } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { useConversations } from '@/entities/conversation'
import { useViewer } from '@/entities/session'
import { useLoginDialogStore } from '@/features/login'
import { useShellStore } from '@/widgets/shell'

type PeerState = { user_id: string; display_name: string; avatar_url?: string | null }

function isPeerState(value: unknown): value is { peer: PeerState } {
  if (!value || typeof value !== 'object') return false
  const peer = (value as { peer?: unknown }).peer
  if (!peer || typeof peer !== 'object') return false
  const record = peer as { user_id?: unknown; display_name?: unknown }
  return typeof record.user_id === 'string' && typeof record.display_name === 'string'
}

export function useMessagesPage() {
  const { viewer } = useViewer()
  const openLogin = useLoginDialogStore((state) => state.open)
  const setHeaderCenter = useShellStore((state) => state.setHeaderCenter)
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
      ? conversations.items.find(
          (item) => item.id === conversation_id || (to !== null && item.peer.user_id === to),
        )
      : undefined
  const from_state = isPeerState(location.state) ? location.state.peer : null
  const peer = listed
    ? {
        user_id: listed.peer.user_id,
        display_name: listed.peer.display_name,
        avatar_url: listed.peer.avatar_url,
      }
    : from_state
      ? from_state
      : to
        ? { user_id: to, display_name: '' }
        : conversation_id
          ? { user_id: '', display_name: '' }
          : null
  const show_thread = Boolean(conversation_id || to)
  const existing_id =
    to && conversations.status === 'ok'
      ? conversations.items.find((item) => item.peer.user_id === to)?.id
      : undefined

  useEffect(() => {
    setHeaderCenter({ kind: 'empty' })
  }, [setHeaderCenter])

  useEffect(() => {
    if (to && existing_id) void navigate(`/messages/${existing_id}`, { replace: true })
  }, [existing_id, navigate, to])

  return { viewer, openLogin, conversation_id, peer, show_thread, to }
}
