import { randomUUID } from 'node:crypto'
import type { Report, ServiceContext } from '@blog/contracts'
import { canRead } from '../../shared/can-read.ts'
import { ForbiddenError, NotFoundError, RestrictedError, UnauthorizedError } from '@blog/errors'
import type { ReportRepositoryPort, ReportRow } from './report.types.ts'

function toReport(row: ReportRow): Report {
  return {
    id: row.id,
    article_id: row.article_id,
    reporter_id: row.reporter_id,
    created_at: row.created_at.toISOString(),
    status: row.status,
  }
}

export class ReportService {
  constructor(
    private readonly repository: ReportRepositoryPort,
    private readonly options: { newId?: () => string } = {},
  ) {}

  async create(viewer: ServiceContext, article_id: string): Promise<Report> {
    if (viewer.user_id === undefined) throw new UnauthorizedError()
    if (viewer.is_restricted) throw new RestrictedError()
    const article = await this.repository.findArticle(article_id)
    if (!article || !canRead(viewer, article)) throw new NotFoundError({ message: 'Такой статьи нет' })
    if (article.author_id === viewer.user_id) throw new ForbiddenError({ message: 'Нельзя пожаловаться на свою статью' })
    return toReport(await this.repository.createOpen({ id: this.newId(), article_id, reporter_id: viewer.user_id }))
  }

  private newId(): string {
    return this.options.newId?.() ?? randomUUID()
  }
}
