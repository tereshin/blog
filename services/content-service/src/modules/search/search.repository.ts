import { and, asc, desc, eq, or, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { articles, profiles, topics, users_copy } from '../../infra/db/schema.ts'
import type { ServiceContext, Topic, UserListItem } from '@blog/contracts'
import type { FeedRow } from '../../shared/feed-card.ts'
import { has_more_content, preview_blocks } from '../../infra/db/article-preview.ts'
import type { SearchCursor } from './search.cursor.ts'
import type { SearchRepositoryPort } from './search.types.ts'
import { visibleArticlesWhere } from '../../infra/db/visible-articles.ts'

const PEOPLE_LIMIT = 8
const TOPICS_LIMIT = 8

const CARD_COLUMNS = {
  id: articles.id,
  slug: articles.slug,
  title: articles.title,
  excerpt: articles.excerpt,
  has_more_content,
  preview_blocks,
  first_image_url: articles.first_image_url,
  published_at: articles.published_at,
  author_id: articles.author_id,
  author_display_name: profiles.display_name,
  author_avatar_url: profiles.avatar_url,
  author_slug: profiles.slug,
  author_public_number: users_copy.public_number,
  author_status_icon_id: profiles.status_icon_id,
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

function likePattern(q: string): string {
  return `%${q.toLowerCase().replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')}%`
}

type FindArticlesInput = { viewer: ServiceContext; q: string; cursor: SearchCursor | null; limit: number }

export class SearchRepository implements SearchRepositoryPort {
  constructor(private readonly db: NodePgDatabase) {}

  async findArticles({ viewer, q, cursor, limit }: FindArticlesInput): Promise<Array<FeedRow & { rank: number }>> {
    const tsquery = sql`websearch_to_tsquery('simple', ${q})`
    const rank = sql<number>`ts_rank(${articles.search_vector}, ${tsquery})`
    const after = cursor
      ? sql`(${rank}, ${articles.published_at}, ${articles.id}) < (${cursor.r}, ${new Date(cursor.t)}, ${cursor.id})`
      : undefined
    const rows = await this.db
      .select({ ...CARD_COLUMNS, rank })
      .from(articles)
      .innerJoin(topics, eq(topics.id, articles.topic_id))
      .leftJoin(profiles, eq(profiles.user_id, articles.author_id))
      .leftJoin(users_copy, eq(users_copy.user_id, articles.author_id))
      .where(
        and(
          visibleArticlesWhere(viewer),
          eq(articles.status, 'published'),
          sql`${articles.published_at} is not null`,
          sql`${articles.search_vector} @@ ${tsquery}`,
          after,
        ),
      )
      .orderBy(desc(rank), desc(articles.published_at), desc(articles.id))
      .limit(limit)
    return rows.map((row) => ({
      ...row,
      published_at: row.published_at as Date,
      rank: Number(row.rank),
    }))
  }

  async findPeople(q: string): Promise<UserListItem[]> {
    const terms = q
      .toLowerCase()
      .replace(/["«»“”]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
    if (terms.length === 0) return []
    const matches = and(
      ...terms.map((term) => {
        const pattern = likePattern(term)
        return sql`(lower(${profiles.display_name}) like ${pattern} escape '\\' or lower(coalesce(${profiles.slug}, '')) like ${pattern} escape '\\')`
      }),
    )
    // Фраза требует совпадения всех слов; для одного слова сохраняем поиск с опечаткой.
    const condition =
      terms.length === 1
        ? or(
            matches,
            sql`(${profiles.display_name} % ${terms[0]} or coalesce(${profiles.slug}, '') % ${terms[0]})`,
          )
        : matches
    const rows = await this.db
      .select({
        user_id: profiles.user_id,
        display_name: profiles.display_name,
        avatar_url: profiles.avatar_url,
        slug: sql<string>`coalesce(${profiles.slug}, ${users_copy.public_number}::text)`,
        reputation: profiles.reputation,
      })
      .from(profiles)
      .innerJoin(users_copy, eq(users_copy.user_id, profiles.user_id))
      .where(and(eq(users_copy.is_deleted, false), condition))
      .orderBy(desc(sql`(${matches})`), asc(profiles.display_name), asc(profiles.user_id))
      .limit(PEOPLE_LIMIT)
    return rows
  }

  async findTopics(q: string): Promise<Topic[]> {
    const pattern = likePattern(q)
    const rows = await this.db
      .select({
        id: topics.id,
        title: topics.title,
        description: topics.description,
        avatar_url: topics.avatar_url,
        cover_url: topics.cover_url,
        slug: topics.slug,
        status: topics.status,
        position: topics.position,
      })
      .from(topics)
      .where(
        and(
          eq(topics.status, 'active'),
          sql`(lower(${topics.title}) like ${pattern} escape '\\' or lower(coalesce(${topics.description}, '')) like ${pattern} escape '\\')`,
        ),
      )
      .orderBy(topics.position)
      .limit(TOPICS_LIMIT)
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      avatar_url: row.avatar_url,
      cover_url: row.cover_url,
      slug: row.slug,
      status: row.status,
      position: row.position,
    }))
  }
}
