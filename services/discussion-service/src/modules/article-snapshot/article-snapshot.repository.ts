import { and, asc, desc, eq, or, sql } from 'drizzle-orm'
import type { Database } from '@blog/broker'
import type { ReactionKind } from '@blog/contracts'
import { bookmarks, comments, reactions, views } from '../../infra/db/schema.ts'
import type { ArticleSnapshotRepositoryPort, TopComment } from './article-snapshot.types.ts'

/** Читает только через переданную транзакцию, поэтому собственного подключения не держит. */
export class ArticleSnapshotRepository implements ArticleSnapshotRepositoryPort<Database> {
  async countReactionKinds(tx: Database, article_id: string): Promise<Array<{ kind: ReactionKind; total: number }>> {
    const rows = await tx
      .select({ kind: reactions.kind, total: sql<number>`count(*)::int` })
      .from(reactions)
      .where(and(eq(reactions.target_type, 'article'), eq(reactions.target_id, article_id)))
      .groupBy(reactions.kind)
    return rows.map((row) => ({ kind: row.kind, total: Number(row.total) }))
  }

  async countThreadComments(tx: Database, article_id: string): Promise<number> {
    const [row] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(comments)
      .where(
        and(
          eq(comments.article_id, article_id),
          or(
            eq(comments.status, 'visible'),
            sql`exists (select 1 from comments reply where reply.parent_id = ${comments.id} and reply.status = 'visible')`,
          ),
        ),
      )
    return Number(row?.total ?? 0)
  }

  async findTopComment(tx: Database, article_id: string): Promise<TopComment | null> {
    const [top] = await tx
      .select({
        id: comments.id,
        author_id: comments.author_id,
        body: comments.body,
        reaction_count: comments.reaction_count,
        reply_count: comments.reply_count,
      })
      .from(comments)
      .where(and(eq(comments.article_id, article_id), eq(comments.status, 'visible')))
      .orderBy(desc(sql`${comments.reaction_count} + ${comments.reply_count}`), asc(comments.created_at), asc(comments.id))
      .limit(1)
    return top ?? null
  }

  /** Сумма `times`: одна строка зрителя может дать больше одного просмотра, если окно 30 минут истекло. */
  async sumViews(tx: Database, article_id: string): Promise<number> {
    const [row] = await tx
      .select({ total: sql<number>`coalesce(sum(${views.times}), 0)::int` })
      .from(views)
      .where(eq(views.article_id, article_id))
    return Number(row?.total ?? 0)
  }

  async countBookmarks(tx: Database, article_id: string): Promise<number> {
    const [row] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(bookmarks)
      .where(eq(bookmarks.article_id, article_id))
    return Number(row?.total ?? 0)
  }
}
