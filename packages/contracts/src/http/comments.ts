import { z } from 'zod'

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
