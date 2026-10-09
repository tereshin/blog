import type { FastifyReply, FastifyRequest } from 'fastify'
import { reportSchema } from '@blog/contracts'
import { reportParamsSchema } from './report.schema.ts'
import type { ReportService } from './report.service.ts'

export function createReportController(service: ReportService) {
  return {
    async create(request: FastifyRequest, reply: FastifyReply) {
      const { id } = reportParamsSchema.parse(request.params)
      return reply.send(reportSchema.parse(await service.create(request.viewer, id)))
    },
  }
}
