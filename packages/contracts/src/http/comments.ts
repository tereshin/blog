import { z } from 'zod'
import { reactionCountsSchema, reactionKindSchema } from './feed.ts'
import { pageSchema } from './pagination.ts'

/** Строка правой карточки: новый комментарий с реакциями доступной зрителю статьи. */
export const popularCommentSchema = z.strictObject({
  id: z.uuid(),
  author_name: z.string(),
  author_avatar_url: z.string().nullable(),
  article_id: z.uuid(),
  article_title: z.string(),
  article_slug: z.string(),
  excerpt: z.string(),
  reaction_count: z.number().int().nonnegative(),
  reaction_counts: reactionCountsSchema,
})
export type PopularComment = z.infer<typeof popularCommentSchema>

/** `GET /v1/comments/popular` — два последних комментария с реакциями. */
export const popularCommentListSchema = z.array(popularCommentSchema).max(2)

export const commentAuthorSchema = z.strictObject({
  user_id: z.uuid(),
  display_name: z.string(),
  avatar_url: z.string().nullable(),
})

export const commentMediaSchema = z.strictObject({
  url: z.url(),
  alt: z.string().max(300).default(''),
})
export const commentMentionSchema = z.strictObject({
  user_id: z.uuid(),
  display_name: z.string().min(1).max(100),
})
export const commentSortSchema = z.enum(['best', 'newest', 'oldest'])
export type CommentSort = z.infer<typeof commentSortSchema>

const commentFields = {
  id: z.uuid(),
  author: commentAuthorSchema,
  reply_count: z.number().int().nonnegative().optional(),
  is_bookmarked: z.boolean().optional(),
  media: z.array(commentMediaSchema).max(4).optional(),
  mentions: z.array(commentMentionSchema).max(10).optional(),
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

/** `POST /v1/articles/{article_id}/comments`. */
export const createCommentSchema = z.strictObject({
  body: z.string().min(1).max(5000),
  parent_id: z.uuid().optional(),
  media: z.array(commentMediaSchema).max(4).optional(),
  mentions: z.array(commentMentionSchema).max(10).optional(),
})
export type CreateComment = z.infer<typeof createCommentSchema>

/** `PATCH /v1/comments/{id}` — только новый текст. */
export const updateCommentSchema = z.strictObject({
  body: z.string().min(1).max(5000),
})
export type UpdateComment = z.infer<typeof updateCommentSchema>
