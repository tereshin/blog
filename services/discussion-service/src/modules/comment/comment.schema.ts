import { z } from 'zod'
import { commentSortSchema, pageQuerySchema } from '@blog/contracts'

/** Ответ маршрута описан в `@blog/contracts` (`popularCommentListSchema`); здесь — лимиты модуля. */
export const POPULAR_COMMENTS_LIMIT = 2
export const COMMENT_EXCERPT_LENGTH = 140

export const CommentParamsSchema = z.strictObject({ article_id: z.uuid() })
export const CommentIdParamsSchema = z.strictObject({ id: z.uuid() })
export const CommentQuerySchema = pageQuerySchema.extend({
  sort: commentSortSchema.default('oldest'),
  include_replies: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
})

export const UserParamsSchema = z.object({ user_id: z.uuid() })
export const UserCommentsQuerySchema = pageQuerySchema.extend({
  sort: z.enum(['fresh', 'popular']).default('fresh'),
})

const CommentCursorSchema = z.strictObject({
  t: z.iso.datetime(),
  id: z.uuid(),
  sort: commentSortSchema.optional(),
  scope: z.string().optional(),
  score: z.number().int().nonnegative().optional(),
})
export type CommentCursor = z.infer<typeof CommentCursorSchema>

export function encodeCommentCursor(cursor: CommentCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeCommentCursor(value: string): CommentCursor {
  return CommentCursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')))
}

const UserCommentCursorSchema = z.discriminatedUnion('k', [
  z.strictObject({ k: z.literal('time'), t: z.iso.datetime(), id: z.uuid() }),
  z.strictObject({ k: z.literal('score'), s: z.number().int().nonnegative(), id: z.uuid() }),
])
export type UserCommentCursor = z.infer<typeof UserCommentCursorSchema>

export function encodeUserCommentCursor(cursor: UserCommentCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeUserCommentCursor(value: string): UserCommentCursor {
  return UserCommentCursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')))
}
