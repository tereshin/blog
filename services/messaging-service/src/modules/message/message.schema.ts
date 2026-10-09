import { z } from 'zod'
import { InvalidMessageCursorError } from './message.errors.ts'

export const MESSAGE_PAGE_SIZE = 20

export const messageQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(MESSAGE_PAGE_SIZE),
})

const cursorSchema = z.strictObject({ t: z.iso.datetime(), id: z.uuid() })
export type MessageCursor = z.infer<typeof cursorSchema>

export function encodeMessageCursor(cursor: MessageCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeMessageCursor(value: string): MessageCursor {
  try {
    return cursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')))
  } catch {
    throw new InvalidMessageCursorError()
  }
}
