import { unreadCountSchema } from '@blog/contracts'
import { http } from '@/shared/api'

export async function getMessagesUnreadCount(signal?: AbortSignal): Promise<number> {
  const body = await http.get('/v1/conversations/unread-count', unreadCountSchema, { signal })
  return body.count
}
