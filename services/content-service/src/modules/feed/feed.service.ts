import { z } from 'zod'
import { reactionCountsSchema } from '@blog/contracts'
import type { FeedCard, FeedPage, ReactionCounts, ServiceContext } from '@blog/contracts'
import { UnauthorizedError } from '@blog/errors'
import { decodeCursor, encodeCursor } from './feed.cursor.ts'
import { popularScore } from './feed.rules.ts'
import type { FeedQuery } from './feed.schema.ts'
import type { FeedRepository, FeedRow, FeedSelection, ProfileLite } from './feed.types.ts'

const EMPTY_COUNTS: ReactionCounts = { laugh: 0, heart: 0, thumb: 0, fire: 0 }
const TOP_COMMENT_EXCERPT_LENGTH = 140

// Формат, в котором событие обсуждения кладёт самый обсуждаемый комментарий в карточку статьи.
const storedTopCommentSchema = z.looseObject({ id: z.uuid(), author_id: z.uuid(), body: z.string() })

export type FeedService = { getPage: (viewer: ServiceContext, query: FeedQuery, now?: Date) => Promise<FeedPage> }

function excerptOf(text: string): string {
  const clean = text.replaceAll(/\s+/g, ' ').trim()
  return clean.length > TOP_COMMENT_EXCERPT_LENGTH ? `${clean.slice(0, TOP_COMMENT_EXCERPT_LENGTH - 1).trimEnd()}…` : clean
}

function timeCursor(query: FeedQuery): Extract<FeedSelection, { kind: 'fresh' }>['cursor'] {
  const cursor = query.cursor ? decodeCursor(query.cursor) : null
  return cursor?.k === 'time' ? cursor : null
}

function selectionOf(query: FeedQuery): FeedSelection {
  const mode = query.mode
  if (mode === 'popular') {
    const cursor = query.cursor ? decodeCursor(query.cursor) : null
    return { kind: 'popular', cursor: cursor?.k === 'score' ? cursor : null }
  }
  const cursor = timeCursor(query)
  return mode === 'fresh' ? { kind: 'fresh', cursor } : { kind: 'fresh', topic_slug: mode.slice('topic:'.length), cursor }
}

export function toFeedCard(row: FeedRow, profiles_by_id: Map<string, ProfileLite>): FeedCard {
  const counts = reactionCountsSchema.safeParse(row.reaction_counts)
  const stored_top = storedTopCommentSchema.safeParse(row.top_comment)
  const top_author = stored_top.success ? profiles_by_id.get(stored_top.data.author_id) : undefined
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    first_image_url: row.first_image_url,
    published_at: row.published_at.toISOString(),
    author: {
      user_id: row.author_id,
      display_name: row.author_display_name ?? '',
      avatar_url: row.author_avatar_url,
      slug: row.author_slug ?? String(row.author_public_number ?? ''),
    },
    topic: { id: row.topic_id, title: row.topic_title, slug: row.topic_slug, status: row.topic_status },
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

export function createFeedService(repository: FeedRepository): FeedService {
  return {
    async getPage(viewer, query, now = new Date()) {
      let selection: FeedSelection
      if (query.mode === 'mine') {
        if (!viewer.user_id) throw new UnauthorizedError()
        const follows = await repository.listFollows(viewer.user_id)
        if (follows.user_ids.length === 0 && follows.topic_ids.length === 0) {
          return { items: [], next_cursor: null, reason: 'no_follows' }
        }
        selection = { kind: 'mine', ...follows, cursor: timeCursor(query) }
      } else {
        selection = selectionOf(query)
      }
      // Берём на одну строку больше: так видно, есть ли следующая порция, без отдельного запроса.
      const rows = await repository.findPage({ viewer, selection, limit: query.limit + 1, now })
      const page_rows = rows.slice(0, query.limit)
      const has_more = rows.length > query.limit

      const top_author_ids = page_rows.flatMap((row) => {
        const stored = storedTopCommentSchema.safeParse(row.top_comment)
        return stored.success ? [stored.data.author_id] : []
      })
      const profiles_by_id = await repository.findProfiles([...new Set(top_author_ids)])

      const last = page_rows.at(-1)
      const next_cursor =
        has_more && last
          ? encodeCursor(
              selection.kind === 'popular'
                ? { k: 'score', s: popularScore(last), id: last.id }
                : { k: 'time', t: last.published_at.toISOString(), id: last.id },
            )
          : null
      return { items: page_rows.map((row) => toFeedCard(row, profiles_by_id)), next_cursor }
    },
  }
}
