import { emptyResponseSchema, http } from '@/shared/api'
import { notificationDtoSchema, toNotification } from './notification-schema.ts'
import type { NotificationModel } from './notification-schema.ts'

export async function markNotificationRead(id: string): Promise<NotificationModel> {
  return toNotification(await http.post(`/v1/notifications/${encodeURIComponent(id)}/read`, notificationDtoSchema))
}

export async function markAllNotificationsRead(): Promise<void> {
  await http.post('/v1/notifications/read-all', emptyResponseSchema)
}
