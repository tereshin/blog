import type { FastifyReply, FastifyRequest } from 'fastify'
import { reportSchema } from '@blog/contracts'
import { ReportParamsSchema } from './report.schema.ts'
import type { ReportService } from './report.service.ts'

export class ReportController {
  constructor(private readonly service: ReportService) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    const { id } = ReportParamsSchema.parse(request.params)
    return reply.send(reportSchema.parse(await this.service.create(request.viewer, id)))
  }
}
