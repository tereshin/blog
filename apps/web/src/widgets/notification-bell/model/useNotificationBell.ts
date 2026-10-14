import { useMutation, useQueryClient } from '@tanstack/react-query'
import { markAllNotificationsRead, markNotificationRead, notificationKeys, useNotifications, useUnreadCount } from '@/entities/notification'
import { useViewer } from '@/entities/session'
import { useLoginDialogStore } from '@/features/login'
import { useNotificationLive } from './useNotificationLive.ts'

export function useNotificationBell() {
  const { viewer } = useViewer()
  const openLogin = useLoginDialogStore((state) => state.open)
  const is_member = viewer.status === 'member'
  const unread = useUnreadCount(is_member)
  const list = useNotifications(is_member)
  const query_client = useQueryClient()
  useNotificationLive(is_member)

  const read_one = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await query_client.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
  const read_all = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => {
      await query_client.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })

  return {
    is_member,
    has_unread: (unread.data ?? 0) > 0,
    list,
    openLogin,
    handleReadOne: (id: string) => read_one.mutate(id),
    handleReadAll: () => read_all.mutate(),
  }
}
