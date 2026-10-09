import { useQueryClient } from '@tanstack/react-query'
import { conversationKeys } from '@/entities/conversation'
import { useLiveSignals } from '@/shared/api'

/** Кадр открытого диалога перечитывает сообщения, список и признак непрочитанного. */
export function useConversationLive(conversation_id: string | null): void {
  const query_client = useQueryClient()
  useLiveSignals({
    subscribe: conversation_id ? { conversation_ids: [conversation_id] } : {},
    on: {
      message: (frames) => {
        void query_client.invalidateQueries({ queryKey: conversationKeys.list() })
        void query_client.invalidateQueries({ queryKey: conversationKeys.unread() })
        if (!conversation_id) return
        const matches = frames.some((frame) => frame.conversation_id === conversation_id)
        if (matches) void query_client.invalidateQueries({ queryKey: conversationKeys.messages(conversation_id) })
      },
    },
    onReconnected: () => {
      if (!conversation_id) return
      void query_client.invalidateQueries({ queryKey: conversationKeys.messages(conversation_id) })
      void query_client.invalidateQueries({ queryKey: conversationKeys.unread() })
    },
  })
}
