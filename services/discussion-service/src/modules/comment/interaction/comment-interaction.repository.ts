import { randomUUID } from 'node:crypto'
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { ModerationFilters, ReactionKind, ServiceContext } from '@blog/contracts'
import { readableArticleWhere } from '../../../infra/db/readable-article-where.ts'
import {
  articles_copy,
  comment_bookmarks,
  comment_reports,
  comments,
  discussion_subscriptions,
  reactions,
  users_copy,
} from '../../../infra/db/schema.ts'
import type { CommentReportRecord } from '../write/comment-write.types.ts'
import type { CommentInteractionRepositoryPort, PageCursor, ReportListRow } from './comment-interaction.types.ts'

const REPORT_COLUMNS = {
  id: comment_reports.id,
  comment_id: comment_reports.comment_id,
  reporter_id: comment_reports.reporter_id,
  reason: comment_reports.reason,
  status: comment_reports.status,
  created_at: comment_reports.created_at,
}

export class CommentInteractionRepository implements CommentInteractionRepositoryPort {
  constructor(private readonly db: NodePgDatabase) {}

  async bookmark(user_id: string, comment_id: string, is_saved: boolean): Promise<{ is_bookmarked: boolean }> {
    if (is_saved)
      await this.db.insert(comment_bookmarks).values({ user_id, comment_id }).onConflictDoNothing()
    else
      await this.db
        .delete(comment_bookmarks)
        .where(
          and(
            eq(comment_bookmarks.user_id, user_id),
            eq(comment_bookmarks.comment_id, comment_id),
          ),
        )
    return { is_bookmarked: is_saved }
  }

  async bookmarks(viewer: ServiceContext, user_id: string, cursor: PageCursor, limit: number) {
    return this.db
      .select({
        id: comments.id,
        article_id: comments.article_id,
        article_slug: articles_copy.slug,
        article_title: articles_copy.title,
        created_at: comment_bookmarks.created_at,
      })
      .from(comment_bookmarks)
      .innerJoin(comments, eq(comments.id, comment_bookmarks.comment_id))
      .innerJoin(articles_copy, eq(articles_copy.article_id, comments.article_id))
      .where(
        and(
          eq(comment_bookmarks.user_id, user_id),
          eq(comments.status, 'visible'),
          readableArticleWhere(viewer),
          cursor
            ? sql`(${comment_bookmarks.created_at}, ${comments.id}) < (${new Date(cursor.t)}, ${cursor.id})`
            : undefined,
        ),
      )
      .orderBy(desc(comment_bookmarks.created_at), desc(comments.id))
      .limit(limit)
  }

  async reactors(comment_id: string, kind: ReactionKind, cursor: PageCursor, limit: number) {
    return this.db
      .select({
        user_id: reactions.user_id,
        display_name: users_copy.display_name,
        avatar_url: users_copy.avatar_url,
        created_at: reactions.created_at,
      })
      .from(reactions)
      .leftJoin(users_copy, eq(users_copy.user_id, reactions.user_id))
      .where(
        and(
          eq(reactions.target_type, 'comment'),
          eq(reactions.target_id, comment_id),
          eq(reactions.kind, kind),
          cursor
            ? sql`(${reactions.created_at}, ${reactions.user_id}) < (${new Date(cursor.t)}, ${cursor.id})`
            : undefined,
        ),
      )
      .orderBy(desc(reactions.created_at), desc(reactions.user_id))
      .limit(limit)
  }

  async report(user_id: string, comment_id: string, reason: string): Promise<CommentReportRecord> {
    await this.db
      .insert(comment_reports)
      .values({ id: randomUUID(), reporter_id: user_id, comment_id, reason })
      .onConflictDoNothing()
    const [row] = await this.db
      .select(REPORT_COLUMNS)
      .from(comment_reports)
      .where(
        and(eq(comment_reports.comment_id, comment_id), eq(comment_reports.reporter_id, user_id)),
      )
      .limit(1)
    if (!row) throw new Error('Comment report was not saved')
    return row
  }

  async reports(cursor: PageCursor, limit: number, filters: ModerationFilters): Promise<ReportListRow[]> {
    return this.db
      .select({
        ...REPORT_COLUMNS,
        body: comments.body,
        author_id: comments.author_id,
        author_name: users_copy.display_name,
        comment_status: comments.status,
        article_id: comments.article_id,
        article_slug: articles_copy.slug,
      })
      .from(comment_reports)
      .innerJoin(comments, eq(comments.id, comment_reports.comment_id))
      .innerJoin(articles_copy, eq(articles_copy.article_id, comments.article_id))
      .leftJoin(users_copy, eq(users_copy.user_id, comments.author_id))
      .where(
        and(
          filters.status !== 'all' ? eq(comment_reports.status, filters.status) : undefined,
          filters.q
            ? or(
                ilike(comments.body, `%${filters.q.replace(/[\\%_]/g, '\\$&')}%`),
                ilike(comment_reports.reason, `%${filters.q.replace(/[\\%_]/g, '\\$&')}%`),
                eq(articles_copy.slug, filters.q),
              )
            : undefined,
          filters.from
            ? sql`${comment_reports.created_at} >= ${new Date(`${filters.from}T00:00:00.000Z`)}`
            : undefined,
          filters.to
            ? sql`${comment_reports.created_at} < ${new Date(new Date(`${filters.to}T00:00:00.000Z`).getTime() + 86_400_000)}`
            : undefined,
          cursor
            ? filters.sort === 'oldest'
              ? sql`(${comment_reports.created_at}, ${comment_reports.id}) > (${new Date(cursor.t)}, ${cursor.id})`
              : sql`(${comment_reports.created_at}, ${comment_reports.id}) < (${new Date(cursor.t)}, ${cursor.id})`
            : undefined,
        ),
      )
      .orderBy(
        ...(filters.sort === 'oldest'
          ? [asc(comment_reports.created_at), asc(comment_reports.id)]
          : [desc(comment_reports.created_at), desc(comment_reports.id)]),
      )
      .limit(limit)
  }

  async subscription(user_id: string, article_id: string, enabled?: boolean): Promise<{ is_subscribed: boolean }> {
    if (enabled === true)
      await this.db
        .insert(discussion_subscriptions)
        .values({ user_id, article_id })
        .onConflictDoNothing()
    if (enabled === false)
      await this.db
        .delete(discussion_subscriptions)
        .where(
          and(
            eq(discussion_subscriptions.user_id, user_id),
            eq(discussion_subscriptions.article_id, article_id),
          ),
        )
    const [row] = await this.db
      .select({ user_id: discussion_subscriptions.user_id })
      .from(discussion_subscriptions)
      .where(
        and(
          eq(discussion_subscriptions.user_id, user_id),
          eq(discussion_subscriptions.article_id, article_id),
        ),
      )
      .limit(1)
    return { is_subscribed: Boolean(row) }
  }

  async mentions(query: string) {
    const escaped = query.replace(/[\\%_]/g, '\\$&')
    return this.db
      .select({
        user_id: users_copy.user_id,
        display_name: users_copy.display_name,
        avatar_url: users_copy.avatar_url,
        slug: users_copy.slug,
      })
      .from(users_copy)
      .where(
        and(eq(users_copy.is_restricted, false), or(ilike(users_copy.display_name, `%${escaped}%`), ilike(users_copy.slug, `%${escaped}%`))),
      )
      .orderBy(users_copy.display_name, users_copy.user_id)
      .limit(10)
  }
}
