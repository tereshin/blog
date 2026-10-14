import type { Message } from '@blog/contracts'
import type { ConversationPair } from '../../shared/pair.ts'
import type { MessageCursor } from './message.schema.ts'

export type MessageRow = {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  created_at: Date
  read_at: Date | null
}

export type AppendMessageInput = {
  pair: ConversationPair
  sender_id: string
  recipient_id: string
  body: string
  excerpt: string
  correlation_id: string
}

/**
 * Порт хранилища сообщений. Отправка идёт в одной транзакции `TTx`: сервис принимает решения,
 * хранилище пишет диалог, сообщение и событие outbox. Конкретный тип транзакции задаёт app.ts.
 */
export type MessageRepositoryPort<TTx> = {
  list: (conversation_id: string, cursor: MessageCursor | null, limit: number) => Promise<MessageRow[]>
  isParticipant: (user_id: string, conversation_id: string) => Promise<boolean>
  transaction: <TResult>(work: (tx: TTx) => Promise<TResult>) => Promise<TResult>
  lockIdempotencyKey: (tx: TTx, sender_id: string, idempotency_key: string) => Promise<void>
  findStoredResponse: (tx: TTx, sender_id: string, idempotency_key: string) => Promise<Message | null>
  storeResponse: (tx: TTx, sender_id: string, idempotency_key: string, message: Message) => Promise<void>
  /** `null` — копии участника нет. */
  findRestriction: (tx: TTx, user_id: string) => Promise<{ is_restricted: boolean } | null>
  appendMessage: (tx: TTx, input: AppendMessageInput) => Promise<MessageRow>
}
