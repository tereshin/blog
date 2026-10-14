import { and, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { articles, reports } from '../../infra/db/schema.ts'
import type { ReportRepositoryPort } from './report.types.ts'

const REPORT_COLUMNS = {
  id: reports.id,
  article_id: reports.article_id,
  reporter_id: reports.reporter_id,
  created_at: reports.created_at,
  status: reports.status,
}

export class ReportRepository implements ReportRepositoryPort {
  constructor(private readonly db: NodePgDatabase) {}

  async findArticle(article_id: string) {
    const [row] = await this.db
      .select({ id: articles.id, author_id: articles.author_id, visibility: articles.visibility, status: articles.status })
      .from(articles)
      .where(eq(articles.id, article_id))
      .limit(1)
    return row ?? null
  }

  async createOpen(input: { id: string; article_id: string; reporter_id: string }) {
    await this.db
      .insert(reports)
      .values({ id: input.id, article_id: input.article_id, reporter_id: input.reporter_id, status: 'open' })
      .onConflictDoNothing({ target: [reports.article_id, reports.reporter_id] })
    const [row] = await this.db
      .select(REPORT_COLUMNS)
      .from(reports)
      .where(and(eq(reports.article_id, input.article_id), eq(reports.reporter_id, input.reporter_id)))
      .limit(1)
    if (!row) throw new Error('report row was not written')
    return row
  }
}
