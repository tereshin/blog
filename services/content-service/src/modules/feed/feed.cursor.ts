import { z } from 'zod'
import { InvalidCursorError } from './feed.errors.ts'

const cursorSchema = z.discriminatedUnion('k', [
  z.strictObject({ k: z.literal('time'), t: z.iso.datetime(), id: z.uuid() }),
  z.strictObject({ k: z.literal('score'), s: z.number().int().nonnegative(), id: z.uuid() }),
])

export type FeedCursor = z.infer<typeof cursorSchema>

export function encodeCursor(cursor: FeedCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeCursor(value: string): FeedCursor {
  try {
    return cursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')))
  } catch {
    throw new InvalidCursorError()
  }
}
