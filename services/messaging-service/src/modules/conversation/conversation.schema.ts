import { z } from 'zod'
import { InvalidCursorError } from './conversation.errors.ts'

export const CONVERSATION_PAGE_SIZE = 20

export const conversationQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(CONVERSATION_PAGE_SIZE),
})

const cursorSchema = z.strictObject({ t: z.iso.datetime(), id: z.uuid() })
export type ConversationCursor = z.infer<typeof cursorSchema>

/** Меньший идентификатор пары становится `user_low_id`. Сравнение строк совпадает с порядком uuid в PostgreSQL. */
export function pairOf(left: string, right: string): { user_low_id: string; user_high_id: string } {
  return left < right ? { user_low_id: left, user_high_id: right } : { user_low_id: right, user_high_id: left }
}

export function encodeConversationCursor(cursor: ConversationCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeConversationCursor(value: string): ConversationCursor {
  try {
    return cursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')))
  } catch {
    throw new InvalidCursorError()
  }
}
