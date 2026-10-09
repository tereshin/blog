import { z } from 'zod'
import { defineEvent } from '../envelope.ts'

/** Модератор скрыл комментарий. Текст с публичных поверхностей уходит, строка остаётся. */
export const CommentHiddenV1 = defineEvent('discussion.comment.hidden', 1, {
  comment_id: z.uuid(),
  article_id: z.uuid(),
  author_id: z.uuid(),
  moderator_id: z.uuid(),
})

export type CommentHiddenV1 = z.infer<typeof CommentHiddenV1>
