import type { FastifyPluginAsync } from 'fastify'
import type { ReportController } from './report.controller.ts'

export type ReportRoutesOptions = { controller: ReportController }

/** Жалоба на чужую доступную статью. Повтор той же пары возвращает прежнюю строку. */
export const reportRoutes: FastifyPluginAsync<ReportRoutesOptions> = async (app, { controller }) => {
  app.post('/v1/articles/:id/reports', (request, reply) => controller.create(request, reply))
}
