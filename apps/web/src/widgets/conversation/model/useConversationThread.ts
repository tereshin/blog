import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  conversationKeys,
  markConversationRead,
  useMessages,
} from '@/entities/conversation'
import { useViewer } from '@/entities/session'
import { useRequireSession } from '@/features/login'
import { useConversationLive } from './useConversationLive.ts'

export function useConversationThread(conversation_id: string | null) {
  const { viewer } = useViewer()
  const requireSession = useRequireSession()
  const query_client = useQueryClient()
  const navigate = useNavigate()
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

  return { messages, items, my_id, end_ref, requireSession, navigate }
}
