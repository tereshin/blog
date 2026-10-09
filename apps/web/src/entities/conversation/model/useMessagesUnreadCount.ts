import { useQuery } from '@tanstack/react-query'
import { getMessagesUnreadCount } from '../api/get-unread-count.ts'
import { conversationKeys } from './conversation-keys.ts'

/** Число непрочитанных сообщений. Вызывающий включает запрос только для участника. */
export function useMessagesUnreadCount(enabled: boolean) {
  return useQuery({
    queryKey: conversationKeys.unread(),
    queryFn: ({ signal }) => getMessagesUnreadCount(signal),
    enabled,
  })
}
