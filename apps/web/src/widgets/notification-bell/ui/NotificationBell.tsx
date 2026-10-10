import { useMutation, useQueryClient } from '@tanstack/react-query'
import { NotificationItem, markAllNotificationsRead, markNotificationRead, notificationKeys, useNotifications, useUnreadCount } from '@/entities/notification'
import { useViewer } from '@/entities/session'
import { useLoginDialog } from '@/features/login'
import { useT } from '@/shared/i18n'
import { BellIcon, Button, ErrorState, Popover } from '@/shared/ui'
import { useNotificationLive } from '../model/useNotificationLive.ts'

/** Колокольчик в шапке: точка при непрочитанном, панель под кнопкой. Гость видит вход. */
export function NotificationBell() {
  const { t } = useT()
  const { viewer } = useViewer()
  const openLogin = useLoginDialog((state) => state.open)
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

  if (!is_member) {
    return (
      <Button variant="ghost" isIconOnly aria-label={t('notification.bell')} onPress={() => openLogin('required')}>
        <BellIcon className="size-6" />
      </Button>
    )
  }

  const has_unread = (unread.data ?? 0) > 0
  return (
    <Popover>
      <Button variant="ghost" isIconOnly aria-label={t('notification.bell')} className="relative">
        <BellIcon className="size-6" />
        {has_unread ? <span role="img" aria-label={t('notification.unread')} className="absolute right-1 top-1 size-2 rounded-avatar bg-accent" /> : null}
      </Button>
      <Popover.Content>
        <div className="flex w-80 flex-col gap-1 p-2">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-sm font-medium">{t('notification.bell')}</p>
            <Button variant="ghost" size="sm" onPress={() => read_all.mutate()} isDisabled={!has_unread}>
              {t('notification.read_all')}
            </Button>
          </div>
          {list.isPending ? <p className="px-2 py-4 text-sm text-muted">{t('common.loading')}</p> : null}
          {list.isError ? <ErrorState title={t('notification.error')} onRetry={() => void list.refetch()} /> : null}
          {list.data && list.data.items.length === 0 ? <p className="px-2 py-6 text-center text-sm text-muted">{t('notification.empty')}</p> : null}
          {list.data?.items.map((item) => (
            <NotificationItem key={item.id} item={item} onOpen={(opened) => read_one.mutate(opened.id)} />
          ))}
        </div>
      </Popover.Content>
    </Popover>
  )
}
