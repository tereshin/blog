import { z } from 'zod'
import { sendMessageSchema } from '@blog/contracts'
import { InvalidMessageCursorError } from './message.errors.ts'

export const MESSAGE_PAGE_SIZE = 20

export const MessageQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(MESSAGE_PAGE_SIZE),
})
export type MessageQuery = z.infer<typeof MessageQuerySchema>

export const ConversationParamsSchema = z.object({ id: z.uuid() })
export const PeerParamsSchema = z.object({ peer_user_id: z.uuid() })
export const SendMessageBodySchema = sendMessageSchema

const MessageCursorSchema = z.strictObject({ t: z.iso.datetime(), id: z.uuid() })
export type MessageCursor = z.infer<typeof MessageCursorSchema>

export function encodeMessageCursor(cursor: MessageCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeMessageCursor(value: string): MessageCursor {
  try {
    return MessageCursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')))
  } catch {
    throw new InvalidMessageCursorError()
  }
}
