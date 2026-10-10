import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import type { Database } from '@blog/broker'
import { REACTION_KINDS } from '@blog/contracts'
import type { Comment, ReactionCounts, ReactionKind } from '@blog/contracts'
import { comments, reactions, users_copy } from '../../infra/db/schema.ts'
import { CommentNotFoundError } from './comment.errors.ts'
import { emptyCounts, toCommentNode, toReplyNode } from './comment.tree.ts'
import type { CommentRow } from './comment.tree.ts'
async function loadRows(tx: Database, ids: readonly string[]): Promise<CommentRow[]> {
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

export async function present(tx: Database, comment_id: string, user_id: string): Promise<Comment> {
  const [row] = await loadRows(tx, [comment_id])
  if (!row) throw new CommentNotFoundError()
  const replies: CommentRow[] = []
  const ids = [row.id, ...replies.map((item) => item.id)]
  const kind_rows = await tx
    .select({
      target_id: reactions.target_id,
      kind: reactions.kind,
      total: sql<number>`count(*)::int`,
    })
    .from(reactions)
    .where(and(eq(reactions.target_type, 'comment'), inArray(reactions.target_id, ids)))
    .groupBy(reactions.target_id, reactions.kind)
  const facts = new Map<string, ReactionCounts>()
  for (const kind_row of kind_rows) {
    const counts = facts.get(kind_row.target_id) ?? emptyCounts()
    if (REACTION_KINDS.includes(kind_row.kind)) counts[kind_row.kind] = Number(kind_row.total)
    facts.set(kind_row.target_id, counts)
  }
  const mine_rows = await tx
    .select({ target_id: reactions.target_id, kind: reactions.kind })
    .from(reactions)
    .where(
      and(
        eq(reactions.user_id, user_id),
        eq(reactions.target_type, 'comment'),
        inArray(reactions.target_id, ids),
      ),
    )
  const mine = new Map<string, ReactionKind>(mine_rows.map((item) => [item.target_id, item.kind]))
  return toCommentNode(
    row,
    facts,
    mine,
    replies.map((reply) => toReplyNode(reply, facts, mine)),
  )
}
