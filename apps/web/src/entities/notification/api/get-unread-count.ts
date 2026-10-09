import { http } from '@/shared/api'
import { unreadCountDtoSchema } from './notification-schema.ts'

export async function getUnreadCount(signal?: AbortSignal): Promise<number> {
  const body = await http.get('/v1/notifications/unread-count', unreadCountDtoSchema, { signal })
  return body.count
}
