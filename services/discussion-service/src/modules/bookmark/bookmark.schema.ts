import { z } from 'zod'
import { pageQuerySchema } from '@blog/contracts'

export const bookmarkParamsSchema = z.strictObject({ article_id: z.uuid() })
export const bookmarkQuerySchema = pageQuerySchema

const cursorSchema = z.strictObject({ t: z.iso.datetime(), id: z.uuid() })
export type BookmarkCursor = z.infer<typeof cursorSchema>

export function encodeBookmarkCursor(cursor: BookmarkCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeBookmarkCursor(value: string): BookmarkCursor {
  return cursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')))
}
