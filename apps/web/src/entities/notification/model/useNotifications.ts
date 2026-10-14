import { useInfiniteQuery } from '@tanstack/react-query'
import { getNotifications } from '../api/get-notifications.ts'
import { notificationKeys } from './notification-keys.ts'

export function useNotifications(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(),
    queryFn: ({ pageParam, signal }) => getNotifications(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next_cursor,
    enabled,
  })
}
