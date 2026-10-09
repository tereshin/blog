import { http } from '@/shared/api'
import { conversationPageSchema, toConversation } from './conversation-schema.ts'
import type { ConversationPageModel } from './conversation-schema.ts'

export async function getConversations(cursor?: string, signal?: AbortSignal): Promise<ConversationPageModel> {
  const page = await http.get('/v1/conversations', conversationPageSchema, { query: { cursor }, signal })
  const now = new Date()
  return { items: page.items.map((item) => toConversation(item, now)), next_cursor: page.next_cursor }
}
