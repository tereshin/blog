import { emptyResponseSchema, http } from '@/shared/api'

export async function markConversationRead(conversation_id: string): Promise<void> {
  await http.post(`/v1/conversations/${encodeURIComponent(conversation_id)}/read`, emptyResponseSchema)
}
