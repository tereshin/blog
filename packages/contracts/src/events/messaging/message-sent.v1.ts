import { z } from 'zod'
import { defineEvent } from '../envelope.ts'

/** Сообщение записано в диалог. Получатель — второй участник пары. */
export const MessageSentV1 = defineEvent('messaging.message.sent', 1, {
  message_id: z.uuid(),
  conversation_id: z.uuid(),
  sender_id: z.uuid(),
  recipient_id: z.uuid(),
  excerpt: z.string().min(1).max(140),
})

export type MessageSentV1 = z.infer<typeof MessageSentV1>
