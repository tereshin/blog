import { z } from 'zod'
import { reactionCountsSchema } from '@blog/contracts'
import type { FeedCard, ReactionCounts } from '@blog/contracts'

const EMPTY_COUNTS: ReactionCounts = { laugh: 0, heart: 0, thumb: 0, fire: 0 }
const TOP_COMMENT_EXCERPT_LENGTH = 140

// Формат, в котором событие обсуждения кладёт самый обсуждаемый комментарий в карточку статьи.
export const StoredTopCommentSchema = z.looseObject({ id: z.uuid(), author_id: z.uuid(), body: z.string() })

export type FeedRow = {
  id: string
  slug: string
  title: string
  excerpt: string
  has_more_content?: boolean
  first_image_url: string | null
  published_at: Date
  author_id: string
  author_display_name: string | null
  author_avatar_url: string | null
  author_slug: string | null
  author_public_number: number | null
  author_status_icon_id: string | null
  topic_id: string
  topic_title: string
  topic_slug: string
  topic_status: 'active' | 'archived'
  topic_avatar_url?: string | null
  reaction_counts: unknown
  reaction_count: number
  comment_count: number
  bookmark_count: number
  view_count: number
  top_comment: unknown
  visibility: 'public' | 'members' | 'author'
  comments_enabled: boolean
}

export type ProfileLite = { display_name: string; avatar_url: string | null }

function excerptOf(text: string): string {
  const clean = text.replaceAll(/\s+/g, ' ').trim()
  return clean.length > TOP_COMMENT_EXCERPT_LENGTH ? `${clean.slice(0, TOP_COMMENT_EXCERPT_LENGTH - 1).trimEnd()}…` : clean
}

export function toFeedCard(row: FeedRow, profiles_by_id: Map<string, ProfileLite>): FeedCard {
  const counts = reactionCountsSchema.safeParse(row.reaction_counts)
  const stored_top = StoredTopCommentSchema.safeParse(row.top_comment)
  const top_author = stored_top.success ? profiles_by_id.get(stored_top.data.author_id) : undefined
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    has_more_content: row.has_more_content ?? true,
    first_image_url: row.first_image_url,
    published_at: row.published_at.toISOString(),
    author: {
      user_id: row.author_id,
      display_name: row.author_display_name ?? '',
      avatar_url: row.author_avatar_url,
      slug: row.author_slug ?? String(row.author_public_number ?? ''),
      status_icon_id: row.author_status_icon_id,
    },
    topic: { id: row.topic_id, title: row.topic_title, slug: row.topic_slug, status: row.topic_status, avatar_url: row.topic_avatar_url ?? null },
    reaction_counts: counts.success ? counts.data : EMPTY_COUNTS,
    reaction_count: row.reaction_count,
    comment_count: row.comment_count,
    bookmark_count: row.bookmark_count,
    view_count: row.view_count,
    top_comment:
      stored_top.success && top_author
        ? { id: stored_top.data.id, author_name: top_author.display_name, author_avatar_url: top_author.avatar_url, excerpt: excerptOf(stored_top.data.body) }
        : null,
    visibility: row.visibility,
    comments_enabled: row.comments_enabled,
  }
}
