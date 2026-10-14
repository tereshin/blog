import { z } from 'zod'
import { InvalidCursorError } from './conversation.errors.ts'

export const CONVERSATION_PAGE_SIZE = 20

export const ConversationQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(CONVERSATION_PAGE_SIZE),
})
export type ConversationQuery = z.infer<typeof ConversationQuerySchema>

export const ConversationParamsSchema = z.object({ id: z.uuid() })
export type ConversationParams = z.infer<typeof ConversationParamsSchema>

const ConversationCursorSchema = z.strictObject({ t: z.iso.datetime(), id: z.uuid() })
export type ConversationCursor = z.infer<typeof ConversationCursorSchema>

export function encodeConversationCursor(cursor: ConversationCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeConversationCursor(value: string): ConversationCursor {
  try {
    return ConversationCursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')))
  } catch {
    throw new InvalidCursorError()
  }
}
