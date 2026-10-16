import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { ReactionKind } from '@blog/contracts'
import type { Database } from '@blog/broker'
import { advisoryLock, findIdempotentResponse, saveIdempotentResponse } from '../../../infra/db/idempotency.ts'
import {
  articles_copy,
  comment_reports,
  comments,
  discussion_subscriptions,
  reactions,
  users_copy,
} from '../../../infra/db/schema.ts'
import type { CommentRow, CommentStatus } from '../comment.tree.ts'
import type {
  CommentReportRecord,
  CommentWriteRepositoryPort,
  NewComment,
  WriteArticle,
  WriteComment,
} from './comment-write.types.ts'

const WRITE_COMMENT_COLUMNS = {
  id: comments.id,
  article_id: comments.article_id,
  author_id: comments.author_id,
  parent_id: comments.parent_id,
  status: comments.status,
  edited_at: comments.edited_at,
}

export class CommentWriteRepository implements CommentWriteRepositoryPort<Database> {
  constructor(private readonly db: NodePgDatabase) {}

  transaction<TResult>(work: (tx: Database) => Promise<TResult>): Promise<TResult> {
    return this.db.transaction((tx) => work(tx))
  }

  lock(tx: Database, key: string): Promise<void> {
    return advisoryLock(tx, key)
  }

  findStoredResponse(tx: Database, user_id: string, idempotency_key: string): Promise<unknown> {
    return findIdempotentResponse(tx, user_id, idempotency_key)
  }

  saveResponse(tx: Database, user_id: string, idempotency_key: string, response: unknown): Promise<void> {
    return saveIdempotentResponse(tx, user_id, idempotency_key, response)
  }

  async findArticle(tx: Database, article_id: string): Promise<WriteArticle | null> {
    const [row] = await tx
      .select({
        author_id: articles_copy.author_id,
        visibility: articles_copy.visibility,
        status: articles_copy.status,
        comments_enabled: articles_copy.comments_enabled,
      })
      .from(articles_copy)
      .where(eq(articles_copy.article_id, article_id))
      .limit(1)
    return row ?? null
  }

  async findComment(tx: Database, comment_id: string): Promise<WriteComment | null> {
    const [row] = await tx.select(WRITE_COMMENT_COLUMNS).from(comments).where(eq(comments.id, comment_id)).limit(1)
    return row ?? null
  }

  async lockComment(tx: Database, comment_id: string): Promise<WriteComment | null> {
    const [row] = await tx
      .select(WRITE_COMMENT_COLUMNS)
      .from(comments)
      .where(eq(comments.id, comment_id))
      .limit(1)
      .for('update')
    return row ?? null
  }

  async findActiveUsers(tx: Database, user_ids: readonly string[]): Promise<{ user_id: string; display_name: string | null }[]> {
    return tx
      .select({ user_id: users_copy.user_id, display_name: users_copy.display_name })
      .from(users_copy)
      .where(and(inArray(users_copy.user_id, [...user_ids]), eq(users_copy.is_restricted, false), eq(users_copy.is_deleted, false)))
  }

  async listSubscriberIds(tx: Database, article_id: string, only_user_id: string | null): Promise<string[]> {
    const rows = await tx
      .select({ user_id: discussion_subscriptions.user_id })
      .from(discussion_subscriptions)
      .innerJoin(users_copy, eq(users_copy.user_id, discussion_subscriptions.user_id))
      .where(
        and(
          eq(discussion_subscriptions.article_id, article_id),
          eq(users_copy.is_restricted, false), eq(users_copy.is_deleted, false),
          only_user_id === null ? undefined : eq(discussion_subscriptions.user_id, only_user_id),
        ),
      )
    return rows.map((row) => row.user_id)
  }

  async insertComment(tx: Database, comment: NewComment): Promise<void> {
    await tx.insert(comments).values({ ...comment, status: 'visible' })
  }

  async updateBody(tx: Database, comment_id: string, body: string, edited_at: Date): Promise<void> {
    await tx.update(comments).set({ body, edited_at }).where(eq(comments.id, comment_id))
  }

  async setStatus(tx: Database, comment_id: string, status: CommentStatus): Promise<void> {
    await tx.update(comments).set({ status }).where(eq(comments.id, comment_id))
  }

  async recountReplies(tx: Database, parent_id: string): Promise<void> {
    await tx
      .update(comments)
      .set({
        reply_count: sql<number>`(
          select count(*)::int from comments as child
          where child.parent_id = ${parent_id}::uuid
            and (child.status = 'visible' or child.reply_count > 0)
        )`,
      })
      .where(eq(comments.id, parent_id))
  }

  async loadRows(tx: Database, ids: readonly string[]): Promise<CommentRow[]> {
    if (ids.length === 0) return []
    return tx
      .select({
        id: comments.id,
        author_id: comments.author_id,
        parent_id: comments.parent_id,
        body: comments.body,
        media: comments.media,
        mentions: comments.mentions,
        status: comments.status,
        edited_at: comments.edited_at,
        reaction_count: comments.reaction_count,
        reply_count: comments.reply_count,
        created_at: comments.created_at,
        author_name: users_copy.display_name,
        author_avatar_url: users_copy.avatar_url,
      })
      .from(comments)
      .leftJoin(users_copy, eq(users_copy.user_id, comments.author_id))
      .where(inArray(comments.id, [...ids]))
      .orderBy(asc(comments.created_at), asc(comments.id))
  }

  async countReactions(tx: Database, ids: readonly string[]): Promise<{ target_id: string; kind: ReactionKind; total: number }[]> {
    const rows = await tx
      .select({ target_id: reactions.target_id, kind: reactions.kind, total: sql<number>`count(*)::int` })
      .from(reactions)
      .where(and(eq(reactions.target_type, 'comment'), inArray(reactions.target_id, [...ids])))
      .groupBy(reactions.target_id, reactions.kind)
    return rows.map((row) => ({ target_id: row.target_id, kind: row.kind, total: Number(row.total) }))
  }

  async findMine(tx: Database, user_id: string, ids: readonly string[]): Promise<{ target_id: string; kind: ReactionKind }[]> {
    return tx
      .select({ target_id: reactions.target_id, kind: reactions.kind })
      .from(reactions)
      .where(and(eq(reactions.user_id, user_id), eq(reactions.target_type, 'comment'), inArray(reactions.target_id, [...ids])))
  }

  async lockReport(tx: Database, report_id: string): Promise<CommentReportRecord | null> {
    const [row] = await tx
      .select({
        id: comment_reports.id,
        comment_id: comment_reports.comment_id,
        reporter_id: comment_reports.reporter_id,
        reason: comment_reports.reason,
        status: comment_reports.status,
        created_at: comment_reports.created_at,
      })
      .from(comment_reports)
      .where(eq(comment_reports.id, report_id))
      .limit(1)
      .for('update')
    return row ?? null
  }

  async markReportReviewed(tx: Database, report_id: string, moderator_id: string, reviewed_at: Date): Promise<void> {
    await tx
      .update(comment_reports)
      .set({ status: 'reviewed', reviewed_by: moderator_id, reviewed_at })
      .where(eq(comment_reports.id, report_id))
  }
}
