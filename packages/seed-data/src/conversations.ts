import { at } from './anchor.ts'
import { seedId } from './ids.ts'
import { userId } from './participants.ts'
import type { SeedConversation } from './types.ts'

export function conversationId(key: string): string {
  return seedId('conversation', key)
}

/** Диалог — неупорядоченная пара: меньший идентификатор всегда в `user_low_id`. */
export function orderPair(first: string, second: string): { user_low_id: string; user_high_id: string } {
  return first < second ? { user_low_id: first, user_high_id: second } : { user_low_id: second, user_high_id: first }
}

export const SMALL_CONVERSATIONS = [
  { key: 'reader-author_a', users: ['reader', 'author_a'], last_message_hours_ago: 3 },
  { key: 'reader-author_b', users: ['reader', 'author_b'], last_message_hours_ago: 70 },
] as const

export function buildSmallConversations(anchor: Date): SeedConversation[] {
  return SMALL_CONVERSATIONS.map((conversation) => ({
    id: conversationId(conversation.key),
    ...orderPair(userId(conversation.users[0]), userId(conversation.users[1])),
    last_message_at: at(anchor, -conversation.last_message_hours_ago * 60 * 60 * 1000),
  }))
}
