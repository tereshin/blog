import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { ServiceContext } from '@blog/contracts'
import { articles, follows, profiles, topics, users_copy } from '../../infra/db/schema.ts'
import { visibleArticlesWhere } from '../access/index.ts'
import type { ProfileCursor } from './profile.cursor.ts'

const score = sql<number>`(${articles.reaction_count} + ${articles.comment_count})`
const fresh_at = sql<Date>`coalesce(${articles.published_at}, ${articles.created_at})`

const card_columns = {
  id: articles.id,
  slug: articles.slug,
  title: articles.title,
  excerpt: articles.excerpt,
  first_image_url: articles.first_image_url,
  published_at: articles.published_at,
  created_at: articles.created_at,
  status: articles.status,
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
  score,
  fresh_at,
}

export type ProfileArticleRow = {
  id: string
  slug: string
  title: string
  excerpt: string
  first_image_url: string | null
  published_at: Date | null
  created_at: Date
  status: 'draft' | 'published' | 'hidden'
  author_id: string
  author_display_name: string | null
  author_avatar_url: string | null
  author_slug: string | null
  author_public_number: number | null
  topic_id: string
  topic_title: string
  topic_slug: string
  topic_status: 'active' | 'archived'
  reaction_counts: unknown
  reaction_count: number
  comment_count: number
  bookmark_count: number
  view_count: number
  top_comment: unknown
  visibility: 'public' | 'members' | 'author'
  comments_enabled: boolean
  score: number
  fresh_at: Date
}

export type UserListRow = {
  user_id: string
  display_name: string
  avatar_url: string | null
  slug: string | null
  public_number: number
  reputation: number
  created_at: Date
}

function timeAfter(cursor: Extract<ProfileCursor, { k: 'time' }> | null, column: SQL): SQL | undefined {
  if (!cursor) return undefined
  return sql`(${column}, ${articles.id}) < (${new Date(cursor.t)}, ${cursor.id})`
}

export function createProfileLists(db: NodePgDatabase) {
  return {
    async listArticles(viewer: ServiceContext, author_id: string, sort: 'fresh' | 'popular', cursor: ProfileCursor | null, limit: number) {
      const after =
        sort === 'popular'
          ? cursor?.k === 'score'
            ? sql`(${score}, ${articles.id}) < (${cursor.s}, ${cursor.id})`
            : undefined
          : timeAfter(cursor?.k === 'time' ? cursor : null, fresh_at)
      const rows = await db
        .select(card_columns)
        .from(articles)
        .innerJoin(topics, eq(topics.id, articles.topic_id))
        .leftJoin(profiles, eq(profiles.user_id, articles.author_id))
        .leftJoin(users_copy, eq(users_copy.user_id, articles.author_id))
        .where(and(eq(articles.author_id, author_id), visibleArticlesWhere(viewer), after))
        .orderBy(sort === 'popular' ? desc(score) : desc(fresh_at), desc(articles.id))
        .limit(limit)
      return rows.filter((row): row is ProfileArticleRow => row.status !== 'deleted')
    },

    async findProfiles(user_ids: string[]) {
      const result = new Map<string, { display_name: string; avatar_url: string | null }>()
      if (user_ids.length === 0) return result
      const rows = await db
        .select({ user_id: profiles.user_id, display_name: profiles.display_name, avatar_url: profiles.avatar_url })
        .from(profiles)
        .where(inArray(profiles.user_id, user_ids))
      for (const row of rows) result.set(row.user_id, { display_name: row.display_name, avatar_url: row.avatar_url })
      return result
    },

    async listFollowers(user_id: string, cursor: ProfileCursor | null, limit: number) {
      const after = cursor?.k === 'follow' ? sql`(${follows.created_at}, ${follows.follower_id}) < (${new Date(cursor.t)}, ${cursor.id})` : undefined
      return db
        .select({
          user_id: profiles.user_id,
          display_name: profiles.display_name,
          avatar_url: profiles.avatar_url,
          slug: profiles.slug,
          public_number: users_copy.public_number,
          reputation: profiles.reputation,
          created_at: follows.created_at,
        })
        .from(follows)
        .innerJoin(profiles, eq(profiles.user_id, follows.follower_id))
        .innerJoin(users_copy, eq(users_copy.user_id, follows.follower_id))
        .where(and(eq(follows.target_type, 'user'), eq(follows.target_id, user_id), after))
        .orderBy(desc(follows.created_at), desc(follows.follower_id))
        .limit(limit)
    },

    async listFollowing(user_id: string, cursor: ProfileCursor | null, limit: number) {
      const after = cursor?.k === 'follow' ? sql`(${follows.created_at}, ${follows.target_id}) < (${new Date(cursor.t)}, ${cursor.id})` : undefined
      return db
        .select({
          user_id: profiles.user_id,
          display_name: profiles.display_name,
          avatar_url: profiles.avatar_url,
          slug: profiles.slug,
          public_number: users_copy.public_number,
          reputation: profiles.reputation,
          created_at: follows.created_at,
        })
        .from(follows)
        .innerJoin(profiles, eq(profiles.user_id, follows.target_id))
        .innerJoin(users_copy, eq(users_copy.user_id, follows.target_id))
        .where(and(eq(follows.follower_id, user_id), eq(follows.target_type, 'user'), after))
        .orderBy(desc(follows.created_at), desc(follows.target_id))
        .limit(limit)
    },

    async stats(user_id: string) {
      const [counts] = await db
        .select({
          view_count: sql<number>`coalesce(sum(${articles.view_count}), 0)::int`,
          reaction_count: sql<number>`coalesce(sum(${articles.reaction_count}), 0)::int`,
        })
        .from(articles)
        .where(and(eq(articles.author_id, user_id), inArray(articles.status, ['published', 'hidden'])))
      const [followers] = await db
        .select({ followers_count: sql<number>`count(*)::int` })
        .from(follows)
        .where(and(eq(follows.target_type, 'user'), eq(follows.target_id, user_id)))
      return {
        view_count: counts?.view_count ?? 0,
        reaction_count: counts?.reaction_count ?? 0,
        followers_count: followers?.followers_count ?? 0,
      }
    },

    async rating(cursor: ProfileCursor | null, limit: number) {
      const after =
        cursor?.k === 'rep'
          ? sql`(${profiles.reputation} < ${cursor.s} or (${profiles.reputation} = ${cursor.s} and ${profiles.user_id} > ${cursor.id}))`
          : undefined
      return db
        .select({
          user_id: profiles.user_id,
          display_name: profiles.display_name,
          avatar_url: profiles.avatar_url,
          slug: profiles.slug,
          public_number: users_copy.public_number,
          reputation: profiles.reputation,
          created_at: users_copy.created_at,
        })
        .from(profiles)
        .innerJoin(users_copy, eq(users_copy.user_id, profiles.user_id))
        .where(after)
        .orderBy(desc(profiles.reputation), asc(profiles.user_id))
        .limit(limit)
    },
  }
}
