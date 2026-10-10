import { z } from 'zod'
import { commentSortSchema, pageQuerySchema } from '@blog/contracts'

/** Ответ маршрута описан в `@blog/contracts` (`popularCommentListSchema`); здесь — лимиты модуля. */
export const POPULAR_COMMENTS_LIMIT = 10
export const COMMENT_EXCERPT_LENGTH = 140

export const commentParamsSchema = z.strictObject({ article_id: z.uuid() })
export const commentIdParamsSchema = z.strictObject({ id: z.uuid() })
export const commentQuerySchema = pageQuerySchema.extend({
  sort: commentSortSchema.default('oldest'),
  include_replies: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
})

const cursorSchema = z.strictObject({
  t: z.iso.datetime(),
  id: z.uuid(),
  sort: commentSortSchema.optional(),
  scope: z.string().optional(),
  score: z.number().int().nonnegative().optional(),
})
export type CommentCursor = z.infer<typeof cursorSchema>

export function encodeCommentCursor(cursor: CommentCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeCommentCursor(value: string): CommentCursor {
  return cursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')))
}

const userCursorSchema = z.discriminatedUnion('k', [
  z.strictObject({ k: z.literal('time'), t: z.iso.datetime(), id: z.uuid() }),
  z.strictObject({ k: z.literal('score'), s: z.number().int().nonnegative(), id: z.uuid() }),
])
export type UserCommentCursor = z.infer<typeof userCursorSchema>

export function encodeUserCommentCursor(cursor: UserCommentCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeUserCommentCursor(value: string): UserCommentCursor {
  return userCursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')))
}
