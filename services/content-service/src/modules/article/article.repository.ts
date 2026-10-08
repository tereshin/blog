import { and, eq, inArray } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { articles, profiles, topics, users_copy } from '../../infra/db/schema.ts'
import { visibleArticlesWhere } from '../access/index.ts'
import type { ArticleRepository, ArticleRow } from './article.types.ts'

const columns = {
  id: articles.id,
  slug: articles.slug,
  title: articles.title,
  excerpt: articles.excerpt,
  first_image_url: articles.first_image_url,
  blocks: articles.blocks,
  published_at: articles.published_at,
  visibility: articles.visibility,
  comments_enabled: articles.comments_enabled,
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
}

function from(db: NodePgDatabase) {
  return db
    .select(columns)
    .from(articles)
    .innerJoin(topics, eq(topics.id, articles.topic_id))
    .leftJoin(profiles, eq(profiles.user_id, articles.author_id))
    .leftJoin(users_copy, eq(users_copy.user_id, articles.author_id))
}

export function createArticleRepository(db: NodePgDatabase): ArticleRepository {
  return {
    async findBySlug(slug) {
      const [row] = await from(db).where(eq(articles.slug, slug)).limit(1)
      return (row as ArticleRow | undefined) ?? null
    },

    async findVisibleByIds(viewer, ids) {
      if (ids.length === 0) return []
      const rows = await from(db).where(and(visibleArticlesWhere(viewer), inArray(articles.id, [...ids])))
      const by_id = new Map(rows.map((row) => [row.id, row as ArticleRow]))
      return ids.flatMap((id) => {
        const row = by_id.get(id)
        return row ? [row] : []
      })
    },

    async findProfiles(user_ids) {
      const result = new Map<string, { display_name: string; avatar_url: string | null }>()
      if (user_ids.length === 0) return result
      const rows = await db
        .select({ user_id: profiles.user_id, display_name: profiles.display_name, avatar_url: profiles.avatar_url })
        .from(profiles)
        .where(inArray(profiles.user_id, [...user_ids]))
      for (const row of rows) result.set(row.user_id, { display_name: row.display_name, avatar_url: row.avatar_url })
      return result
    },
  }
}
