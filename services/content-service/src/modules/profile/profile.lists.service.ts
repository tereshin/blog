import { z } from 'zod'
import { reactionCountsSchema } from '@blog/contracts'
import type { ProfileArticle, ProfileArticlePage, ProfileStats, ServiceContext, UserListItem, UserListPage } from '@blog/contracts'
import { UnauthorizedError } from '@blog/errors'
import { decodeProfileCursor, encodeProfileCursor } from './profile.cursor.ts'
import type { ProfileCursor } from './profile.cursor.ts'
import { createProfileLists } from './profile.lists.ts'
import type { ProfileArticleRow, UserListRow } from './profile.lists.ts'
import type { ProfileService } from './profile.types.ts'

const EMPTY_COUNTS = { laugh: 0, heart: 0, thumb: 0, fire: 0 }
const storedTopCommentSchema = z.looseObject({ id: z.uuid(), author_id: z.uuid(), body: z.string() })

export type ProfileListQuery = { sort?: 'fresh' | 'popular'; cursor?: string; limit: number }
export type PageQuery = { cursor?: string; limit: number }

function toItem(row: UserListRow): UserListItem {
  return {
    user_id: row.user_id,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    slug: row.slug ?? String(row.public_number),
    reputation: row.reputation,
  }
}

function toArticle(
  row: ProfileArticleRow,
  profiles_by_id: Map<string, { display_name: string; avatar_url: string | null }>,
): ProfileArticle {
  const counts = reactionCountsSchema.safeParse(row.reaction_counts)
  const stored_top = storedTopCommentSchema.safeParse(row.top_comment)
  const top_author = stored_top.success ? profiles_by_id.get(stored_top.data.author_id) : undefined
  const excerpt = stored_top.success ? stored_top.data.body.replaceAll(/\s+/g, ' ').trim() : ''
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    first_image_url: row.first_image_url,
    published_at: row.published_at ? row.published_at.toISOString() : null,
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
        ? { id: stored_top.data.id, author_name: top_author.display_name, author_avatar_url: top_author.avatar_url, excerpt: excerpt.slice(0, 140) }
        : null,
    visibility: row.visibility,
    comments_enabled: row.comments_enabled,
    status: row.status,
  }
}

function pageOf<T>(rows: T[], limit: number, cursorOf: (row: T) => ProfileCursor): { items: T[]; next_cursor: string | null } {
  const items = rows.slice(0, limit)
  const last = items.at(-1)
  return { items, next_cursor: rows.length > limit && last ? encodeProfileCursor(cursorOf(last)) : null }
}

export function createProfileListService(repository: ReturnType<typeof createProfileLists>, profiles: ProfileService) {
  return {
    async articles(viewer: ServiceContext, slug: string, query: ProfileListQuery): Promise<ProfileArticlePage> {
      const profile = await profiles.getBySlug(viewer, slug)
      const sort = query.sort ?? 'fresh'
      const cursor = query.cursor ? decodeProfileCursor(query.cursor) : null
      const rows = await repository.listArticles(viewer, profile.user_id, sort, cursor, query.limit + 1)
      const page = pageOf(rows, query.limit, (row) =>
        sort === 'popular'
          ? { k: 'score', s: Number(row.score), id: row.id }
          : { k: 'time', t: new Date(row.fresh_at).toISOString(), id: row.id },
      )
      const author_ids = page.items.flatMap((row) => {
        const stored = storedTopCommentSchema.safeParse(row.top_comment)
        return stored.success ? [stored.data.author_id] : []
      })
      const profiles_by_id = await repository.findProfiles([...new Set(author_ids)])
      return { items: page.items.map((row) => toArticle(row, profiles_by_id)), next_cursor: page.next_cursor }
    },

    async followers(viewer: ServiceContext, slug: string, query: PageQuery): Promise<UserListPage> {
      const profile = await profiles.getBySlug(viewer, slug)
      const cursor = query.cursor ? decodeProfileCursor(query.cursor) : null
      const rows = await repository.listFollowers(profile.user_id, cursor, query.limit + 1)
      const page = pageOf(rows, query.limit, (row) => ({ k: 'follow', t: row.created_at.toISOString(), id: row.user_id }))
      return { items: page.items.map(toItem), next_cursor: page.next_cursor }
    },

    async following(viewer: ServiceContext, slug: string, query: PageQuery): Promise<UserListPage> {
      const profile = await profiles.getBySlug(viewer, slug)
      const cursor = query.cursor ? decodeProfileCursor(query.cursor) : null
      const rows = await repository.listFollowing(profile.user_id, cursor, query.limit + 1)
      const page = pageOf(rows, query.limit, (row) => ({ k: 'follow', t: row.created_at.toISOString(), id: row.user_id }))
      return { items: page.items.map(toItem), next_cursor: page.next_cursor }
    },

    async stats(viewer: ServiceContext): Promise<ProfileStats> {
      if (!viewer.user_id) throw new UnauthorizedError()
      return repository.stats(viewer.user_id)
    },

    async rating(query: PageQuery): Promise<UserListPage> {
      const cursor = query.cursor ? decodeProfileCursor(query.cursor) : null
      const rows = await repository.rating(cursor, query.limit + 1)
      const page = pageOf(rows, query.limit, (row) => ({ k: 'rep', s: row.reputation, id: row.user_id }))
      return { items: page.items.map(toItem), next_cursor: page.next_cursor }
    },
  }
}

export type ProfileListService = ReturnType<typeof createProfileListService>
