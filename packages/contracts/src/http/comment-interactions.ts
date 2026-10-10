import { z } from 'zod'
import { commentAuthorSchema, commentSchema } from './comments.ts'
import { pageSchema } from './pagination.ts'
export const commentBookmarkStateSchema = z.strictObject({ is_bookmarked: z.boolean() })
export const commentBookmarkPageSchema = pageSchema(
  z.strictObject({
    comment: commentSchema,
    article_id: z.uuid(),
    article_slug: z.string(),
    article_title: z.string(),
  }),
)
export const commentReactorPageSchema = pageSchema(commentAuthorSchema)
export const commentThreadSchema = z.strictObject({
  article_id: z.uuid(),
  root: commentSchema,
  target: commentSchema,
})
export const discussionSubscriptionSchema = z.strictObject({ is_subscribed: z.boolean() })
export const createCommentReportSchema = z.strictObject({
  reason: z.string().trim().min(3).max(1000),
})
export const commentReportSchema = z.strictObject({
  id: z.uuid(),
  comment_id: z.uuid(),
  reporter_id: z.uuid(),
  reason: z.string(),
  status: z.enum(['open', 'reviewed']),
  created_at: z.iso.datetime(),
})
export type CommentReport = z.infer<typeof commentReportSchema>
export const commentReportPageSchema = pageSchema(
  commentReportSchema.extend({
    body: z.string().nullable(),
    article_slug: z.string(),
    article_id: z.uuid(),
  }),
)
export const reviewCommentReportSchema = z.strictObject({
  action: z.enum(['dismiss', 'hide', 'delete']),
})
export const mentionSearchSchema = z.array(commentAuthorSchema).max(10)
