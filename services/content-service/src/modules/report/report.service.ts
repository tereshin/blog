import { randomUUID } from 'node:crypto'
import { canReadArticle } from '@blog/contracts'
import type { Report, ServiceContext } from '@blog/contracts'
import { ForbiddenError, NotFoundError, RestrictedError, UnauthorizedError } from '@blog/errors'
import type { ReportRepository, ReportRow } from './report.types.ts'

export type ReportService = {
  create: (viewer: ServiceContext, article_id: string) => Promise<Report>
}

function toReport(row: ReportRow): Report {
  return {
    id: row.id,
    article_id: row.article_id,
    reporter_id: row.reporter_id,
    created_at: row.created_at.toISOString(),
    status: row.status,
  }
}

export function createReportService(repository: ReportRepository, options: { newId?: () => string } = {}): ReportService {
  const newId = options.newId ?? randomUUID
  return {
    async create(viewer, article_id) {
      if (viewer.user_id === undefined) throw new UnauthorizedError()
      if (viewer.is_restricted) throw new RestrictedError()
      const article = await repository.findArticle(article_id)
      if (!article || !canReadArticle(viewer, article)) throw new NotFoundError({ message: 'Такой статьи нет' })
      if (article.author_id === viewer.user_id) throw new ForbiddenError({ message: 'Нельзя пожаловаться на свою статью' })
      return toReport(await repository.createOpen({ id: newId(), article_id, reporter_id: viewer.user_id }))
    },
  }
}
