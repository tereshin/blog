import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { articleStatusSchema, moderationPageSchema, reportSchema, reviewReportSchema } from '@blog/contracts'
import { createModerationService } from './moderation.service.ts'
import type { ModerationRepository } from './moderation.repository.ts'

const filterQuery = z.object({ filter: z.enum(['reported', 'hidden']).default('reported') })
const idParams = z.object({ id: z.uuid() })
const statusBody = z.object({ id: z.uuid(), status: articleStatusSchema })

export function createModerationController(repository: ModerationRepository) {
  const service = createModerationService(repository)
  return {
    async list(request: FastifyRequest, reply: FastifyReply) {
      const query = filterQuery.parse(request.query)
      return reply.send(moderationPageSchema.parse(await service.list(request.viewer, query.filter)))
    },
    async hide(request: FastifyRequest, reply: FastifyReply) {
      const params = idParams.parse(request.params)
      const article = await service.hide(request.viewer, params.id, request.correlation_id)
      return reply.send(statusBody.parse({ id: article.id, status: article.status }))
    },
    async restore(request: FastifyRequest, reply: FastifyReply) {
      const params = idParams.parse(request.params)
      const article = await service.restore(request.viewer, params.id, request.correlation_id)
      return reply.send(statusBody.parse({ id: article.id, status: article.status }))
    },
    async remove(request: FastifyRequest, reply: FastifyReply) {
      const params = idParams.parse(request.params)
      await service.remove(request.viewer, params.id, request.correlation_id)
      return reply.status(204).send()
    },
    async review(request: FastifyRequest, reply: FastifyReply) {
      const params = idParams.parse(request.params)
      reviewReportSchema.parse(request.body)
      return reply.send(reportSchema.parse(await service.review(request.viewer, params.id)))
    },
  }
}
