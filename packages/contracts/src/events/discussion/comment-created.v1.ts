import { z } from 'zod'
import { defineEvent } from '../envelope.ts'

/** Комментарий или ответ сохранён. `parent_*` пустые у корня обсуждения. */
export const CommentCreatedV1 = defineEvent('discussion.comment.created', 1, {
  comment_id: z.uuid(),
  article_id: z.uuid(),
  author_id: z.uuid(),
  parent_id: z.uuid().nullable(),
  parent_author_id: z.uuid().nullable(),
  article_author_id: z.uuid(),
  excerpt: z.string(),
})

export type CommentCreatedV1 = z.infer<typeof CommentCreatedV1>
