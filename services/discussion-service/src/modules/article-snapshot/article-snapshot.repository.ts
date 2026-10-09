import { and, asc, desc, eq, or, sql } from 'drizzle-orm'
import type { ArticleCountersUpdatedV1 } from '@blog/contracts'
import type { Database } from '@blog/broker'
import { REACTION_KINDS } from '@blog/contracts'
import type { ReactionCounts } from '@blog/contracts'
import { bookmarks, comments, reactions, views } from '../../infra/db/schema.ts'

export type ArticleCounterSnapshot = Pick<
  ArticleCountersUpdatedV1,
  'article_id' | 'reaction_counts' | 'reaction_count' | 'comment_count' | 'view_count' | 'bookmark_count' | 'top_comment'
>

function emptyCounts(): ReactionCounts {
  return { laugh: 0, heart: 0, thumb: 0, fire: 0 }
}

async function countOf(tx: Database, table: typeof bookmarks, article_id: string): Promise<number> {
  const [row] = await tx
    .select({ total: sql<number>`count(*)::int` })
    .from(table)
    .where(eq(table.article_id, article_id))
  return Number(row?.total ?? 0)
}

/** Сумма `times`: одна строка зрителя может дать больше одного просмотра, если окно 30 минут истекло. */
async function viewTotal(tx: Database, article_id: string): Promise<number> {
  const [row] = await tx
    .select({ total: sql<number>`coalesce(sum(${views.times}), 0)::int` })
    .from(views)
    .where(eq(views.article_id, article_id))
  return Number(row?.total ?? 0)
}

/**
 * Снимок счётчиков статьи из таблиц обсуждения. Вызывается в той же транзакции, что и изменение,
 * поэтому числа уже включают только что записанную реакцию или закладку.
 */
export async function loadArticleCounters(tx: Database, article_id: string): Promise<ArticleCounterSnapshot> {
  const kind_rows = await tx
    .select({ kind: reactions.kind, total: sql<number>`count(*)::int` })
    .from(reactions)
    .where(and(eq(reactions.target_type, 'article'), eq(reactions.target_id, article_id)))
    .groupBy(reactions.kind)
  const reaction_counts = emptyCounts()
  for (const row of kind_rows) {
    if (REACTION_KINDS.includes(row.kind)) reaction_counts[row.kind] = Number(row.total)
  }
  const reaction_count = REACTION_KINDS.reduce((sum, kind) => sum + reaction_counts[kind], 0)

  const [comment_row] = await tx
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

  return {
    article_id,
    reaction_counts,
    reaction_count,
    comment_count: Number(comment_row?.total ?? 0),
    view_count: await viewTotal(tx, article_id),
    bookmark_count: await countOf(tx, bookmarks, article_id),
    top_comment: top
      ? { id: top.id, author_id: top.author_id, body: top.body, reaction_count: top.reaction_count, reply_count: top.reply_count }
      : null,
  }
}
