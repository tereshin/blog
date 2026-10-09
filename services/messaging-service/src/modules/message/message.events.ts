import { MessageSentV1 } from '@blog/contracts'
import { appendToOutbox, newEventId } from '@blog/broker'
import type { Database } from '@blog/broker'

type MessageSentInput = {
  correlation_id: string
  occurred_at: string
  message_id: string
  conversation_id: string
  sender_id: string
  recipient_id: string
  excerpt: string
}

export function messageSentEvent(input: MessageSentInput) {
  return MessageSentV1.parse({
    event_id: newEventId(),
    name: 'messaging.message.sent',
    occurred_at: input.occurred_at,
    correlation_id: input.correlation_id,
    causation_id: null,
    version: 1,
    message_id: input.message_id,
    conversation_id: input.conversation_id,
    sender_id: input.sender_id,
    recipient_id: input.recipient_id,
    excerpt: input.excerpt,
  })
}

export async function appendMessageSent(tx: Database, input: MessageSentInput): Promise<void> {
  await appendToOutbox(tx, messageSentEvent(input))
}
