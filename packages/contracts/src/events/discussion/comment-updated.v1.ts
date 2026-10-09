import { z } from 'zod'
import { defineEvent } from '../envelope.ts'

/** Текст изменён или комментарий снят автором. `edited_at` пустой, если правки текста не было. */
export const CommentUpdatedV1 = defineEvent('discussion.comment.updated', 1, {
  comment_id: z.uuid(),
  article_id: z.uuid(),
  status: z.enum(['visible', 'deleted', 'hidden']),
  edited_at: z.iso.datetime().nullable(),
})

export type CommentUpdatedV1 = z.infer<typeof CommentUpdatedV1>
