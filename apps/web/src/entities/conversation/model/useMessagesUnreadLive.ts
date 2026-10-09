import { useQueryClient } from '@tanstack/react-query'
import { useLiveSignals } from '@/shared/api'
import { conversationKeys } from './conversation-keys.ts'

/** Кадр `message` обновляет признак у «Сообщений», даже если диалог не открыт. */
export function useMessagesUnreadLive(enabled: boolean): void {
  const query_client = useQueryClient()
  useLiveSignals({
    subscribe: {},
    on: {
      message: () => {
        if (!enabled) return
        void query_client.invalidateQueries({ queryKey: conversationKeys.unread() })
        void query_client.invalidateQueries({ queryKey: conversationKeys.list() })
      },
    },
    onReconnected: () => {
      if (!enabled) return
      void query_client.invalidateQueries({ queryKey: conversationKeys.unread() })
    },
  })
}
