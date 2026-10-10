import { eq } from 'drizzle-orm'
import type { Database } from '@blog/broker'
import type { Comment } from '@blog/contracts'
import { comments } from '../../infra/db/schema.ts'
import { loadArticleCounters } from '../article-snapshot/index.ts'
import { CommentNotFoundError } from './comment.errors.ts'
import { appendCommentHidden, appendCommentUpdated } from './comment.events.ts'
import { recountReplies } from './comment.counts.ts'
import { present } from './comment.presentation.ts'
import type { CommentStatus } from './comment.tree.ts'
export async function moderateComment(
  tx: Database,
  input: {
    comment_id: string
    status: CommentStatus
    correlation_id: string
    moderator_id: string
  },
): Promise<Comment> {
  const [row] = await tx
    .select()
    .from(comments)
    .where(eq(comments.id, input.comment_id))
    .limit(1)
    .for('update')
  if (!row) throw new CommentNotFoundError()
  if (row.status !== input.status) {
    await tx.update(comments).set({ status: input.status }).where(eq(comments.id, row.id))
    if (row.parent_id) await recountReplies(tx, row.parent_id)
    const occurred_at = new Date().toISOString()
    const snapshot = await loadArticleCounters(tx, row.article_id)
    await appendCommentUpdated(tx, {
      correlation_id: input.correlation_id,
      occurred_at,
      snapshot,
      comment_id: row.id,
      status: input.status,
      edited_at: row.edited_at ? row.edited_at.toISOString() : null,
    })
    if (input.status === 'hidden') {
      await appendCommentHidden(tx, {
        correlation_id: input.correlation_id,
        occurred_at,
        comment_id: row.id,
        article_id: row.article_id,
        author_id: row.author_id,
        moderator_id: input.moderator_id,
      })
    }
  }
  return present(tx, row.id, input.moderator_id)
}
