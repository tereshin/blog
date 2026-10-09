import type { FastifyPluginAsync } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createReportController } from './report.controller.ts'
import { createReportRepository } from './report.repository.ts'
import { createReportService } from './report.service.ts'

export type ReportRoutesOptions = { database: DbHandle }

/** Жалоба на чужую доступную статью. Повтор той же пары возвращает прежнюю строку. */
export const reportRoutes: FastifyPluginAsync<ReportRoutesOptions> = async (app, options) => {
  const controller = createReportController(createReportService(createReportRepository(options.database.db)))
  app.post('/v1/articles/:id/reports', (request, reply) => controller.create(request, reply))
}
