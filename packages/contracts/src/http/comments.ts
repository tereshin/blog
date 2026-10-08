import { z } from 'zod'
import { reactionCountsSchema, reactionKindSchema } from './feed.ts'
import { pageSchema } from './pagination.ts'

/** Строка правой карточки: самый популярный комментарий доступной зрителю статьи. */
export const popularCommentSchema = z.strictObject({
  id: z.uuid(),
  author_name: z.string(),
  author_avatar_url: z.string().nullable(),
  article_id: z.uuid(),
  article_title: z.string(),
  article_slug: z.string(),
  excerpt: z.string(),
  reaction_count: z.number().int().nonnegative(),
})
export type PopularComment = z.infer<typeof popularCommentSchema>

/** `GET /v1/comments/popular` — до 10 строк. */
export const popularCommentListSchema = z.array(popularCommentSchema).max(10)

export const commentAuthorSchema = z.strictObject({
  user_id: z.uuid(),
  display_name: z.string(),
  avatar_url: z.string().nullable(),
})

const commentFields = {
  id: z.uuid(),
  author: commentAuthorSchema,
  /** У заглушки удалённого или скрытого комментария текста нет. */
  body: z.string().nullable(),
  status: z.enum(['visible', 'deleted', 'hidden']),
  edited_at: z.iso.datetime().nullable(),
  reaction_counts: reactionCountsSchema,
  reaction_count: z.number().int().nonnegative(),
  my_reaction: reactionKindSchema.nullable(),
  created_at: z.iso.datetime(),
}

/** Ответ внутри корня. Вложенность глубже одного уровня в этой выдаче не передаётся. */
export const commentReplySchema = z.strictObject(commentFields)

/** Корень обсуждения вместе с ответами. */
export const commentSchema = z.strictObject({
  ...commentFields,
  replies: z.array(commentReplySchema),
})
export type Comment = z.infer<typeof commentSchema>

/** `GET /v1/articles/{article_id}/comments` — корни по курсору, ответы внутри корня. */
export const commentTreePageSchema = z.strictObject({
  comments: z.array(commentSchema),
  next_cursor: z.string().nullable(),
})
export type CommentTreePage = z.infer<typeof commentTreePageSchema>

/** Комментарий в списке профиля: фрагмент и статья, на которой он оставлен. */
export const userCommentSchema = z.strictObject({
  id: z.uuid(),
  excerpt: z.string(),
  article_id: z.uuid(),
  article_title: z.string(),
  article_slug: z.string(),
  created_at: z.iso.datetime(),
  reaction_count: z.number().int().nonnegative(),
})
export type UserComment = z.infer<typeof userCommentSchema>

export const userCommentPageSchema = pageSchema(userCommentSchema)
export type UserCommentPage = z.infer<typeof userCommentPageSchema>
