import type { FastifyReply, FastifyRequest } from 'fastify'
import { recordViewSchema, viewCountSchema } from '@blog/contracts'
import { viewParamsSchema } from './view.schema.ts'
import type { ViewService } from './view.service.ts'

export function createViewController(service: ViewService) {
  return {
    async record(request: FastifyRequest, reply: FastifyReply) {
      const params = viewParamsSchema.parse(request.params)
      const body = recordViewSchema.parse(request.body ?? {})
      const response = await service.record({
        viewer: request.viewer,
        article_id: params.article_id,
        context: body.context,
        correlation_id: request.correlation_id,
      })
      return reply.send(viewCountSchema.parse(response))
    },
  }
}
