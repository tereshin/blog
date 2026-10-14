import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm'
import type { Database } from '@blog/broker'
import type { ModerationFilters } from '@blog/contracts'
import { articles, profiles, reports, topics, users_copy } from '../../infra/db/schema.ts'
import type { ModerationCursor } from './moderation.cursor.ts'
import type { ModerationArticle, ModerationListFilter, ModerationReport } from './moderation.types.ts'

function textMatch(q: string) {
  const escaped = q.replace(/[\\%_]/g, '\\$&')
  return q ? or(ilike(articles.title, `%${escaped}%`), eq(articles.slug, q)) : undefined
}
function articleFilters(filters: ModerationFilters) {
  return [
    textMatch(filters.q),
    filters.topic_id ? eq(articles.topic_id, filters.topic_id) : undefined,
    filters.article_status !== 'all' ? eq(articles.status, filters.article_status) : undefined,
  ]
}
function period(
  column: typeof articles.updated_at | typeof reports.created_at,
  filters: ModerationFilters,
) {
  return [
    filters.from ? sql`${column} >= ${new Date(`${filters.from}T00:00:00.000Z`)}` : undefined,
    filters.to
      ? sql`${column} < ${new Date(new Date(`${filters.to}T00:00:00.000Z`).getTime() + 86_400_000)}`
      : undefined,
  ]
}
function after(
  column: typeof articles.updated_at | typeof reports.created_at,
  id: typeof articles.id | typeof reports.id,
  filters: ModerationFilters,
  cursor: ModerationCursor | null,
) {
  if (!cursor) return undefined
  return filters.sort === 'oldest'
    ? sql`(${column}, ${id}) > (${new Date(cursor.t)}, ${cursor.id})`
    : sql`(${column}, ${id}) < (${new Date(cursor.t)}, ${cursor.id})`
}
const ARTICLE_COLUMNS = {
  id: articles.id,
  author_id: articles.author_id,
  slug: articles.slug,
  title: articles.title,
  excerpt: articles.excerpt,
  first_image_url: articles.first_image_url,
  published_at: articles.published_at,
  created_at: articles.created_at,
  updated_at: articles.updated_at,
  visibility: articles.visibility,
  comments_enabled: articles.comments_enabled,
  status: articles.status,
  reaction_counts: articles.reaction_counts,
  reaction_count: articles.reaction_count,
  comment_count: articles.comment_count,
  bookmark_count: articles.bookmark_count,
  view_count: articles.view_count,
}
export const REPORT_COLUMNS = {
  id: reports.id,
  article_id: reports.article_id,
  reporter_id: reports.reporter_id,
  created_at: reports.created_at,
  status: reports.status,
}
const SELECTION = {
  article: ARTICLE_COLUMNS,
  topic: { id: topics.id, title: topics.title, slug: topics.slug, status: topics.status },
  profile: { display_name: profiles.display_name, avatar_url: profiles.avatar_url, slug: profiles.slug, status_icon_id: profiles.status_icon_id },
  user: { public_number: users_copy.public_number },
}

/** Очереди модерации: статьи с жалобами, скрытые, поиск и сами жалобы. */
export class ModerationReadRepository {
  constructor(protected readonly db: Database) {}

  async list(
    filter: ModerationListFilter,
    limit: number,
    filters: ModerationFilters,
    cursor: ModerationCursor | null,
  ): Promise<{ articles: ModerationArticle[]; reports: ModerationReport[] }> {
    const order = filters.sort === 'oldest' ? asc : desc
    const exact = sql<boolean>`${articles.slug} = ${filters.q}`
    const time_cursor = after(articles.updated_at, articles.id, filters, cursor)
    const cursor_condition =
      filter === 'search' && cursor
        ? cursor.exact
          ? or(and(exact, time_cursor), sql`not (${exact})`)
          : and(sql`not (${exact})`, time_cursor)
        : time_cursor
    const condition =
      filter === 'hidden'
        ? eq(articles.status, 'hidden')
        : filter === 'search'
          ? inArray(articles.status, ['published', 'hidden'])
          : sql`exists (select 1 from ${reports} r where r.article_id = ${articles.id} and r.status = 'open')`
    const rows = await this.db
      .select(SELECTION)
      .from(articles)
      .innerJoin(topics, eq(topics.id, articles.topic_id))
      .leftJoin(profiles, eq(profiles.user_id, articles.author_id))
      .leftJoin(users_copy, eq(users_copy.user_id, articles.author_id))
      .where(
        and(
          condition,
          ne(articles.status, 'deleted'),
          ...articleFilters(filters),
          ...period(articles.updated_at, filters),
          cursor_condition,
        ),
      )
      .orderBy(
        ...(filter === 'search' ? [desc(exact)] : []),
        order(articles.updated_at),
        order(articles.id),
      )
      .limit(limit)
    const ids = rows.map((row) => row.article.id)
    const report_rows = ids.length
      ? await this.db.select(REPORT_COLUMNS).from(reports).where(inArray(reports.article_id, ids))
      : []
    return { articles: rows, reports: report_rows }
  }

  async listReports(
    limit: number,
    filters: ModerationFilters,
    cursor: ModerationCursor | null,
  ): Promise<Array<ModerationArticle & { report: ModerationReport }>> {
    const order = filters.sort === 'oldest' ? asc : desc
    return this.db
      .select({ ...SELECTION, report: REPORT_COLUMNS })
      .from(reports)
      .innerJoin(articles, eq(articles.id, reports.article_id))
      .innerJoin(topics, eq(topics.id, articles.topic_id))
      .leftJoin(profiles, eq(profiles.user_id, articles.author_id))
      .leftJoin(users_copy, eq(users_copy.user_id, articles.author_id))
      .where(
        and(
          filters.status !== 'all' ? eq(reports.status, filters.status) : undefined,
          ...articleFilters(filters),
          ...period(reports.created_at, filters),
          after(reports.created_at, reports.id, filters, cursor),
        ),
      )
      .orderBy(order(reports.created_at), order(reports.id))
      .limit(limit)
  }
}
