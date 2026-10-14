import { emptyResponseSchema, http } from '@/shared/api'
import { notificationDtoSchema, toNotification } from './notification-schema.ts'
import type { NotificationModel } from './notification-schema.ts'

export async function markNotificationRead(id: string): Promise<NotificationModel> {
  return toNotification(await http.patch(`/v1/notifications/${encodeURIComponent(id)}`, notificationDtoSchema))
}

export async function markAllNotificationsRead(): Promise<void> {
  await http.patch('/v1/notifications', emptyResponseSchema)
}
