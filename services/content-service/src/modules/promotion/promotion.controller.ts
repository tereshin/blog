import type { FastifyReply, FastifyRequest } from 'fastify'
import { confirmPromotionSchema, promotionSchema } from '@blog/contracts'
import { promotionParamsSchema } from './promotion.schema.ts'
import type { PromotionService } from './promotion.service.ts'

export function createPromotionController(service: PromotionService) {
  return {
    async confirm(request: FastifyRequest, reply: FastifyReply) {
      const { id } = promotionParamsSchema.parse(request.params)
      confirmPromotionSchema.parse(request.body)
      return reply.send(promotionSchema.parse(await service.confirm(request.viewer, id)))
    },
    async get(request: FastifyRequest, reply: FastifyReply) {
      const { id } = promotionParamsSchema.parse(request.params)
      return reply.send(promotionSchema.parse(await service.get(request.viewer, id)))
    },
  }
}
