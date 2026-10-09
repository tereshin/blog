import { http } from '@/shared/api'
import { notificationPageDtoSchema, toNotification } from './notification-schema.ts'
import type { NotificationModel } from './notification-schema.ts'

export async function getNotifications(signal?: AbortSignal): Promise<{ items: NotificationModel[]; next_cursor: string | null }> {
  const page = await http.get('/v1/notifications', notificationPageDtoSchema, { signal })
  return { items: page.items.map(toNotification), next_cursor: page.next_cursor }
}
