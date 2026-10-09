import { z } from 'zod'
import { formatTime } from '@/shared/lib'

const count = z.number().int().nonnegative()

const articleSchema = z.object({
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
  top_comment: z.object({ id: z.string(), author_name: z.string(), author_avatar_url: z.string().nullable(), excerpt: z.string() }).nullable(),
  visibility: z.enum(['public', 'members', 'author']),
  comments_enabled: z.boolean(),
})

export const searchDtoSchema = z.object({
  articles: z.array(articleSchema),
  people: z.array(z.object({
    user_id: z.string(),
    display_name: z.string(),
    avatar_url: z.string().nullable(),
    slug: z.string(),
    reputation: z.number().int(),
  })),
  topics: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    avatar_url: z.string().nullable(),
    cover_url: z.string().nullable(),
    slug: z.string(),
    status: z.enum(['active', 'archived']),
    position: z.number().int(),
  })),
  next_cursor: z.string().nullable(),
})

export type SearchArticle = ReturnType<typeof toSearchArticle>
export type SearchPerson = { user_id: string; display_name: string; avatar_url: string | null; slug: string; reputation: number; href: string }
export type SearchTopic = { id: string; title: string; slug: string }
export type SearchResult = { articles: SearchArticle[]; people: SearchPerson[]; topics: SearchTopic[]; next_cursor: string | null }

export function toSearchArticle(dto: z.infer<typeof articleSchema>, now: Date = new Date()) {
  return {
    ...dto,
    time_label: formatTime(dto.published_at, now),
    author: { ...dto.author, href: `/u/${encodeURIComponent(dto.author.slug)}` },
    topic: { ...dto.topic, href: `/t/${encodeURIComponent(dto.topic.slug)}` },
    href: `/p/${encodeURIComponent(dto.slug)}`,
  }
}

export function toSearchResult(dto: z.infer<typeof searchDtoSchema>, now: Date = new Date()): SearchResult {
  return {
    articles: dto.articles.map((item) => toSearchArticle(item, now)),
    people: dto.people.map((person) => ({ ...person, href: `/u/${encodeURIComponent(person.slug)}` })),
    topics: dto.topics.map((topic) => ({ id: topic.id, title: topic.title, slug: topic.slug })),
    next_cursor: dto.next_cursor,
  }
}
