import { messageSchema, sendMessageSchema } from '@blog/contracts'
import type { SendMessage } from '@blog/contracts'
import { http } from '@/shared/api'
import { toMessage } from './conversation-schema.ts'
import type { MessageModel } from './conversation-schema.ts'

export async function sendMessage(peer_user_id: string, body: SendMessage, idempotency_key: string): Promise<MessageModel> {
  const message = await http.post(`/v1/conversations/with/${encodeURIComponent(peer_user_id)}/messages`, messageSchema, {
    body: sendMessageSchema.parse(body),
    idempotency_key,
  })
  return toMessage(message)
}
