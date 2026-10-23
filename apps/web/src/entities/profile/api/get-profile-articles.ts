import { editorBlockSchema, reactionCountsSchema } from '@blog/contracts'
import { z } from 'zod'
import { http } from '@/shared/api'
import type { ProfileArticleStatus } from '../model/profile-types.ts'

const count = z.number().int().nonnegative()

export const profileArticleDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string(),
  preview_blocks: z.array(editorBlockSchema).max(2).optional(),
  has_more_content: z.boolean().optional(),
  first_image_url: z.string().nullable(),
  published_at: z.string().nullable(),
  author: z.object({
    user_id: z.string(),
    display_name: z.string(),
    avatar_url: z.string().nullable(),
    slug: z.string(),
    status_icon_id: z.string().nullable().default(null),
  }),
  topic: z.object({ id: z.string(), title: z.string(), slug: z.string(), status: z.enum(['active', 'archived']), avatar_url: z.string().nullable().optional() }),
  reaction_counts: reactionCountsSchema,
  reaction_count: count,
  comment_count: count,
  bookmark_count: count,
  view_count: count,
  top_comment: z
    .object({ id: z.string(), author_name: z.string(), author_avatar_url: z.string().nullable(), excerpt: z.string() })
    .nullable(),
  visibility: z.enum(['public', 'members', 'author']),
  comments_enabled: z.boolean(),
  status: z.enum(['draft', 'published', 'hidden']).default('published'),
})

const pageSchema = z.object({
  items: z.array(profileArticleDtoSchema),
  next_cursor: z.string().nullable(),
})

export type ProfileArticleDto = z.infer<typeof profileArticleDtoSchema> & { status: ProfileArticleStatus }

export function getProfileArticles(slug: string, sort: 'fresh' | 'popular', cursor: string | null, signal?: AbortSignal) {
  return http.get(`/v1/profiles/${encodeURIComponent(slug)}/articles`, pageSchema, {
    query: { sort, cursor: cursor ?? undefined },
    signal,
  })
}
