import { and, desc, eq, gt, gte, inArray, or, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { articles, follows, profiles, promotions, topics, users_copy } from '../../infra/db/schema.ts'
import { visibleArticlesWhere } from '../access/index.ts'
import { POPULAR_WINDOW_MS } from './feed.rules.ts'
import type { FeedRepository } from './feed.types.ts'

// Только нужные колонки: `blocks` (тело статьи) в ленту не читается.
const card_columns = {
  id: articles.id,
  slug: articles.slug,
  title: articles.title,
  excerpt: articles.excerpt,
  first_image_url: articles.first_image_url,
  published_at: articles.published_at,
  author_id: articles.author_id,
  author_display_name: profiles.display_name,
  author_avatar_url: profiles.avatar_url,
  author_slug: profiles.slug,
  author_public_number: users_copy.public_number,
  topic_id: topics.id,
  topic_title: topics.title,
  topic_slug: topics.slug,
  topic_status: topics.status,
  reaction_counts: articles.reaction_counts,
  reaction_count: articles.reaction_count,
  comment_count: articles.comment_count,
  bookmark_count: articles.bookmark_count,
  view_count: articles.view_count,
  top_comment: articles.top_comment,
  visibility: articles.visibility,
  comments_enabled: articles.comments_enabled,
}

const score = sql<number>`(${articles.reaction_count} + ${articles.comment_count})`

export function createFeedRepository(db: NodePgDatabase): FeedRepository {
  return {
    async findPage({ viewer, selection, limit, now }) {
      const base = and(visibleArticlesWhere(viewer), eq(articles.status, 'published'), sql`${articles.published_at} is not null`)

      if (selection.kind === 'popular') {
        const window_start = new Date(now.getTime() - POPULAR_WINDOW_MS)
        const after = selection.cursor ? sql`(${score}, ${articles.id}) < (${selection.cursor.s}, ${selection.cursor.id})` : undefined
        const rows = await db
          .select(card_columns)
          .from(articles)
          .innerJoin(topics, eq(topics.id, articles.topic_id))
          .leftJoin(profiles, eq(profiles.user_id, articles.author_id))
          .leftJoin(users_copy, eq(users_copy.user_id, articles.author_id))
          .leftJoin(promotions, eq(promotions.article_id, articles.id))
          .where(and(base, or(gte(articles.published_at, window_start), gt(promotions.until, now)), after))
          .orderBy(desc(score), desc(articles.id))
          .limit(limit)
        return rows.map((row) => ({ ...row, published_at: row.published_at as Date }))
      }

      const after = selection.cursor
        ? sql`(${articles.published_at}, ${articles.id}) < (${new Date(selection.cursor.t)}, ${selection.cursor.id})`
        : undefined
      const followed =
        selection.kind === 'mine'
          ? selection.user_ids.length > 0 && selection.topic_ids.length > 0
            ? or(inArray(articles.author_id, selection.user_ids), inArray(articles.topic_id, selection.topic_ids))
            : selection.user_ids.length > 0
              ? inArray(articles.author_id, selection.user_ids)
              : inArray(articles.topic_id, selection.topic_ids)
          : undefined
      const rows = await db
        .select(card_columns)
        .from(articles)
        .innerJoin(topics, eq(topics.id, articles.topic_id))
        .leftJoin(profiles, eq(profiles.user_id, articles.author_id))
        .leftJoin(users_copy, eq(users_copy.user_id, articles.author_id))
        .where(and(base, selection.kind === 'fresh' && selection.topic_slug ? eq(topics.slug, selection.topic_slug) : undefined, followed, after))
        .orderBy(desc(articles.published_at), desc(articles.id))
        .limit(limit)
      return rows.map((row) => ({ ...row, published_at: row.published_at as Date }))
    },

    async listFollows(user_id) {
      const rows = await db
        .select({ target_type: follows.target_type, target_id: follows.target_id })
        .from(follows)
        .where(eq(follows.follower_id, user_id))
      return {
        user_ids: rows.filter((row) => row.target_type === 'user').map((row) => row.target_id),
        topic_ids: rows.filter((row) => row.target_type === 'topic').map((row) => row.target_id),
      }
    },

    async findProfiles(user_ids) {
      const result = new Map<string, { display_name: string; avatar_url: string | null }>()
      if (user_ids.length === 0) return result
      const rows = await db
        .select({ user_id: profiles.user_id, display_name: profiles.display_name, avatar_url: profiles.avatar_url })
        .from(profiles)
        .where(inArray(profiles.user_id, user_ids))
      for (const row of rows) result.set(row.user_id, { display_name: row.display_name, avatar_url: row.avatar_url })
      return result
    },
  }
}
