import { z } from 'zod'
import { ApiError, http } from '@/shared/api'
import type { ArticleLoad, ArticleModel } from '../model/article-types.ts'

const blockSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
})

const articleDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  blocks: z.object({ blocks: z.array(blockSchema) }),
  author: z.object({ user_id: z.string(), display_name: z.string(), avatar_url: z.string().nullable(), slug: z.string() }),
  topic: z.object({ id: z.string(), title: z.string(), slug: z.string(), status: z.enum(['active', 'archived']) }),
  published_at: z.string().nullable(),
  visibility: z.enum(['public', 'members', 'author']),
  comments_enabled: z.boolean(),
  status: z.enum(['draft', 'published', 'hidden', 'deleted']),
  reaction_counts: z.object({ laugh: z.number(), heart: z.number(), thumb: z.number(), fire: z.number() }),
  reaction_count: z.number(),
  comment_count: z.number(),
  bookmark_count: z.number(),
  view_count: z.number(),
  is_own: z.boolean(),
})

function toArticle(dto: z.infer<typeof articleDtoSchema>): ArticleModel {
  return {
    ...dto,
    blocks: dto.blocks.blocks,
    author: { ...dto.author, href: `/u/${encodeURIComponent(dto.author.slug)}` },
    topic: { ...dto.topic, href: `/t/${encodeURIComponent(dto.topic.slug)}` },
  }
}

/** Полная статья. Отказы доступа — состояния, а не исключение: экран остаётся на месте. */
export async function getArticle(slug: string, signal?: AbortSignal): Promise<ArticleLoad> {
  try {
    const dto = await http.get(`/v1/articles/${encodeURIComponent(slug)}`, articleDtoSchema, signal ? { signal } : {})
    return { status: 'ok', article: toArticle(dto) }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && error.reason === 'members_only') return { status: 'members_only' }
    if (error instanceof ApiError && error.status === 404) return { status: 'unavailable' }
    throw error
  }
}
