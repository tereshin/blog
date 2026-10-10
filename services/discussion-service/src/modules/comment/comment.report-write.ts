import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Database } from '@blog/broker'
import { NotFoundError } from '@blog/errors'
import { comment_reports } from '../../infra/db/schema.ts'
import { moderateComment } from './comment.moderate-write.ts'
export function createCommentReportReviewer(db: NodePgDatabase) {
  return async (input: {
    id: string
    moderator_id: string
    action: 'dismiss' | 'hide' | 'delete'
    correlation_id: string
  }) =>
    db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(comment_reports)
        .where(eq(comment_reports.id, input.id))
        .limit(1)
        .for('update')
      if (!row) throw new NotFoundError()
      if (row.status !== 'reviewed') {
        if (input.action !== 'dismiss')
          await moderateComment(tx as Database, {
            comment_id: row.comment_id,
            moderator_id: input.moderator_id,
            status: input.action === 'hide' ? 'hidden' : 'deleted',
            correlation_id: input.correlation_id,
          })
        await tx
          .update(comment_reports)
          .set({ status: 'reviewed', reviewed_by: input.moderator_id, reviewed_at: new Date() })
          .where(eq(comment_reports.id, input.id))
      }
      return {
        id: row.id,
        comment_id: row.comment_id,
        reporter_id: row.reporter_id,
        reason: row.reason,
        status: 'reviewed' as const,
        created_at: row.created_at.toISOString(),
      }
    })
}
