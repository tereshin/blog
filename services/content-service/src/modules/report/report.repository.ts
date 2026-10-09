import { and, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { articles, reports } from '../../infra/db/schema.ts'
import type { ReportRepository } from './report.types.ts'

const report_columns = {
  id: reports.id,
  article_id: reports.article_id,
  reporter_id: reports.reporter_id,
  created_at: reports.created_at,
  status: reports.status,
}

export function createReportRepository(db: NodePgDatabase): ReportRepository {
  return {
    async findArticle(article_id) {
      const [row] = await db
        .select({ id: articles.id, author_id: articles.author_id, visibility: articles.visibility, status: articles.status })
        .from(articles)
        .where(eq(articles.id, article_id))
        .limit(1)
      return row ?? null
    },
    async createOpen(input) {
      await db
        .insert(reports)
        .values({ id: input.id, article_id: input.article_id, reporter_id: input.reporter_id, status: 'open' })
        .onConflictDoNothing({ target: [reports.article_id, reports.reporter_id] })
      const [row] = await db
        .select(report_columns)
        .from(reports)
        .where(and(eq(reports.article_id, input.article_id), eq(reports.reporter_id, input.reporter_id)))
        .limit(1)
      if (!row) throw new Error('report row was not written')
      return row
    },
  }
}
