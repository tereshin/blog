import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Database } from '@blog/broker'
import { NotFoundError } from '@blog/errors'
import { articles, reports } from '../../infra/db/schema.ts'
import { appendArticleEvent } from '../article/article.events.ts'
import { requestArticleCover } from '../social-cover/index.ts'
import type { StoredArticle } from '../article/article.types.ts'
export function createArticleReportReviewer(db: NodePgDatabase) {
  return async (input: {
    id: string
    action: 'dismiss' | 'hide' | 'delete'
    moderator_id: string
    correlation_id: string
  }) =>
    (db as Database).transaction(async (tx) => {
      const [report] = await tx
        .select()
        .from(reports)
        .where(eq(reports.id, input.id))
        .limit(1)
        .for('update')
      if (!report) throw new NotFoundError()
      if (report.status === 'reviewed') return report
      if (input.action !== 'dismiss') {
        const [current] = await tx
          .select()
          .from(articles)
          .where(eq(articles.id, report.article_id))
          .limit(1)
          .for('update')
        if (!current) throw new NotFoundError()
        const status = input.action === 'hide' ? 'hidden' : 'deleted'
        if (current.status !== status && current.status !== 'deleted') {
          const [row] = await tx
            .update(articles)
            .set({ status, updated_at: new Date() })
            .where(eq(articles.id, current.id))
            .returning()
          if (!row) throw new NotFoundError()
          const next: StoredArticle = row
          const event =
            input.action === 'hide' ? 'content.article.hidden' : 'content.article.deleted'
          await requestArticleCover(tx, row.id, input.correlation_id)
          await appendArticleEvent(tx, event, next, input.correlation_id, input.moderator_id)
          if (input.action === 'hide')
            await appendArticleEvent(tx, 'content.article.updated', next, input.correlation_id)
        }
      }
      const [reviewed] = await tx
        .update(reports)
        .set({ status: 'reviewed' })
        .where(eq(reports.id, report.id))
        .returning()
      return reviewed ?? report
    })
}
