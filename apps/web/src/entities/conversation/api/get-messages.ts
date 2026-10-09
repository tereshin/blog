import { http } from '@/shared/api'
import { messagePageSchema, toMessage } from './conversation-schema.ts'
import type { MessagePageModel } from './conversation-schema.ts'

export async function getMessages(conversation_id: string, cursor?: string, signal?: AbortSignal): Promise<MessagePageModel> {
  const page = await http.get(`/v1/conversations/${encodeURIComponent(conversation_id)}/messages`, messagePageSchema, {
    query: { cursor },
    signal,
  })
  const now = new Date()
  return { items: page.items.map((item) => toMessage(item, now)), next_cursor: page.next_cursor }
}
