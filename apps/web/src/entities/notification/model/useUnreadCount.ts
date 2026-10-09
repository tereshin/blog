import { useQuery } from '@tanstack/react-query'
import { getUnreadCount } from '../api/get-unread-count.ts'
import { notificationKeys } from './notification-keys.ts'

/** Число непрочитанных. Вызывающий включает запрос только для вошедшего. */
export function useUnreadCount(enabled: boolean) {
  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: ({ signal }) => getUnreadCount(signal),
    enabled,
  })
}
