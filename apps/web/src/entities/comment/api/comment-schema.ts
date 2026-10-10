import { z } from 'zod'
import { reactionCountsSchema } from '@blog/contracts'

export const popularCommentDtoSchema = z.object({
  id: z.string(),
  author_name: z.string(),
  author_avatar_url: z.string().nullable(),
  article_id: z.string(),
  article_title: z.string(),
  article_slug: z.string(),
  excerpt: z.string(),
  reaction_count: z.number().int().nonnegative(),
  reaction_counts: reactionCountsSchema,
})

export const popularCommentListDtoSchema = z.array(popularCommentDtoSchema)

type PopularCommentDto = z.infer<typeof popularCommentDtoSchema>

export type PopularCommentModel = {
  id: string
  author_name: string
  author_avatar_url: string | null
  article_title: string
  excerpt: string
  reaction_count: number
  reaction_counts: z.infer<typeof reactionCountsSchema>
  /** Ссылка на статью у этого комментария. */
  href: string
}

export function toPopularComment(dto: PopularCommentDto): PopularCommentModel {
  return {
    id: dto.id,
    author_name: dto.author_name,
    author_avatar_url: dto.author_avatar_url,
    article_title: dto.article_title,
    excerpt: dto.excerpt,
    reaction_count: dto.reaction_count,
    reaction_counts: dto.reaction_counts,
    href: `/p/${encodeURIComponent(dto.article_slug)}#comment-${dto.id}`,
  }
}
