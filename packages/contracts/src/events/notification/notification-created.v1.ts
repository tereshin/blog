import { z } from 'zod'
import { notificationKindSchema } from '../../http/notifications.ts'
import { defineEvent } from '../envelope.ts'

/** Уведомление записано адресату. Повторная доставка того же события новую запись не создаёт. */
export const NotificationCreatedV1 = defineEvent('notification.notification.created', 1, {
  notification_id: z.uuid(),
  user_id: z.uuid(),
  kind: notificationKindSchema,
})

export type NotificationCreatedV1 = z.infer<typeof NotificationCreatedV1>
