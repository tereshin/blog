import { useQuery } from '@tanstack/react-query'
import { getNotifications } from '../api/get-notifications.ts'
import { notificationKeys } from './notification-keys.ts'

export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: ({ signal }) => getNotifications(signal),
    enabled,
  })
}
