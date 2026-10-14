import { useCallback, useMemo } from 'react'
import { NotificationItem } from '@/entities/notification'
import { useT } from '@/shared/i18n'
import { BellIcon, Button, ErrorState, Popover, VirtualList } from '@/shared/ui'
import { useNotificationBell } from '../model/useNotificationBell.ts'

const VIRTUALIZATION_THRESHOLD = 20

/** Колокольчик в шапке: точка при непрочитанном, панель под кнопкой. Гость видит вход. */
export function NotificationBell() {
  const { t } = useT()
  const bell = useNotificationBell()
  const items = useMemo(
    () => bell.list.data?.pages.flatMap((page) => page.items) ?? [],
    [bell.list.data],
  )
  const item_by_id = useMemo(() => new Map(items.map((item) => [item.id, item])), [items])
  const ids = items.map((item) => item.id)
  const handleNearEnd = useCallback(() => {
    if (bell.list.hasNextPage && !bell.list.isFetchingNextPage) void bell.list.fetchNextPage()
  }, [bell.list])

  if (!bell.is_member) {
    return (
      <Button variant="ghost" isIconOnly aria-label={t('notification.bell')} onPress={() => bell.openLogin('required')}>
        <BellIcon className="size-6" />
      </Button>
    )
  }

  return (
    <Popover>
      <Button variant="ghost" isIconOnly aria-label={t('notification.bell')} className="relative">
        <BellIcon className="size-6" />
        {bell.has_unread ? <span role="img" aria-label={t('notification.unread')} className="absolute right-1 top-1 size-2 rounded-avatar bg-accent" /> : null}
      </Button>
      <Popover.Content>
        <div className="flex w-80 flex-col gap-1">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-sm font-medium">{t('notification.bell')}</p>
            <Button variant="ghost" size="sm" onPress={bell.handleReadAll} isDisabled={!bell.has_unread}>
              {t('notification.read_all')}
            </Button>
          </div>
          {bell.list.isPending ? <p className="px-2 py-4 text-sm text-muted">{t('common.loading')}</p> : null}
          {bell.list.isError ? <ErrorState title={t('notification.error')} onRetry={() => void bell.list.refetch()} /> : null}
          {bell.list.data && items.length === 0 ? <p className="px-2 py-6 text-center text-sm text-muted">{t('notification.empty')}</p> : null}
          {ids.length > VIRTUALIZATION_THRESHOLD ? (
            <div className="max-h-80 overflow-y-auto">
              <VirtualList
                ids={ids}
                estimate_size={64}
                onNearEnd={handleNearEnd}
                renderItem={(id) => {
                  const item = item_by_id.get(id)
                  return item ? (
                    <NotificationItem item={item} onOpen={(opened) => bell.handleReadOne(opened.id)} />
                  ) : null
                }}
              />
            </div>
          ) : (
            items.map((item) => (
              <NotificationItem key={item.id} item={item} onOpen={(opened) => bell.handleReadOne(opened.id)} />
            ))
          )}
        </div>
      </Popover.Content>
    </Popover>
  )
}
