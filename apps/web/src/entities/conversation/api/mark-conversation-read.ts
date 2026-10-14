import { emptyResponseSchema, http } from '@/shared/api'

export async function markConversationRead(conversation_id: string): Promise<void> {
  await http.patch(`/v1/conversations/${encodeURIComponent(conversation_id)}`, emptyResponseSchema)
}
