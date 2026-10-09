import { z } from 'zod'
import { formatTime } from '@/shared/lib'
import type { ArticleCardModel, FeedPageModel } from '../model/article-types.ts'

const count = z.number().int().nonnegative()

export const feedCardDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string(),
  first_image_url: z.string().nullable(),
  published_at: z.string(),
  author: z.object({ user_id: z.string(), display_name: z.string(), avatar_url: z.string().nullable(), slug: z.string() }),
  topic: z.object({ id: z.string(), title: z.string(), slug: z.string(), status: z.enum(['active', 'archived']) }),
  reaction_counts: z.object({ laugh: count, heart: count, thumb: count, fire: count }),
  reaction_count: count,
  comment_count: count,
  bookmark_count: count,
  view_count: count,
  top_comment: z
    .object({ id: z.string(), author_name: z.string(), author_avatar_url: z.string().nullable(), excerpt: z.string() })
    .nullable(),
  visibility: z.enum(['public', 'members', 'author']),
  comments_enabled: z.boolean(),
})

export const feedPageDtoSchema = z.object({
  items: z.array(feedCardDtoSchema),
  next_cursor: z.string().nullable(),
  reason: z.enum(['no_follows']).optional(),
})

type FeedCardDto = z.infer<typeof feedCardDtoSchema>
type FeedPageDto = z.infer<typeof feedPageDtoSchema>

export function toArticleCard(dto: FeedCardDto, now: Date = new Date()): ArticleCardModel {
  return {
    ...dto,
    time_label: formatTime(dto.published_at, now),
    author: { ...dto.author, href: `/u/${encodeURIComponent(dto.author.slug)}` },
    topic: { ...dto.topic, href: `/t/${encodeURIComponent(dto.topic.slug)}` },
    href: `/p/${encodeURIComponent(dto.slug)}`,
  }
}

export function toFeedPage(dto: FeedPageDto, now: Date = new Date()): FeedPageModel {
  return {
    items: dto.items.map((item) => toArticleCard(item, now)),
    next_cursor: dto.next_cursor,
    ...(dto.reason ? { reason: dto.reason } : {}),
  }
}
