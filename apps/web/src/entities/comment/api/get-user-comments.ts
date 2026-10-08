import { z } from 'zod'
import { http } from '@/shared/api'

const itemSchema = z.object({
  id: z.string(),
  excerpt: z.string(),
  article_id: z.string(),
  article_title: z.string(),
  article_slug: z.string(),
  created_at: z.string(),
  reaction_count: z.number().int().nonnegative(),
})

const pageSchema = z.object({
  items: z.array(itemSchema),
  next_cursor: z.string().nullable(),
})

export type UserCommentModel = z.infer<typeof itemSchema> & { href: string }
export type UserCommentPage = { items: UserCommentModel[]; next_cursor: string | null }

export function getUserComments(user_id: string, sort: 'fresh' | 'popular', cursor: string | null, signal?: AbortSignal): Promise<UserCommentPage> {
  return http
    .get(`/v1/users/${encodeURIComponent(user_id)}/comments`, pageSchema, { query: { sort, cursor: cursor ?? undefined }, signal })
    .then((page) => ({
      items: page.items.map((item) => ({ ...item, href: `/p/${encodeURIComponent(item.article_slug)}#comment-${item.id}` })),
      next_cursor: page.next_cursor,
    }))
}