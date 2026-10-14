import { z } from 'zod'
import { pageQuerySchema } from '@blog/contracts'

export const BookmarkParamsSchema = z.strictObject({ article_id: z.uuid() })
export const BookmarkQuerySchema = pageQuerySchema

const BookmarkCursorSchema = z.strictObject({ t: z.iso.datetime(), id: z.uuid() })
export type BookmarkCursor = z.infer<typeof BookmarkCursorSchema>

export function encodeBookmarkCursor(cursor: BookmarkCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeBookmarkCursor(value: string): BookmarkCursor {
  return BookmarkCursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')))
}
