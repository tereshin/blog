import { z } from 'zod'
import { pageQuerySchema } from '@blog/contracts'

/** Ответ маршрута описан в `@blog/contracts` (`popularCommentListSchema`); здесь — лимиты модуля. */
export const POPULAR_COMMENTS_LIMIT = 10
export const COMMENT_EXCERPT_LENGTH = 140

export const commentParamsSchema = z.strictObject({ article_id: z.uuid() })
export const commentQuerySchema = pageQuerySchema

const cursorSchema = z.strictObject({ t: z.iso.datetime(), id: z.uuid() })
export type CommentCursor = z.infer<typeof cursorSchema>

export function encodeCommentCursor(cursor: CommentCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeCommentCursor(value: string): CommentCursor {
  return cursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')))
}
