import type { FastifyReply, FastifyRequest } from 'fastify'
import { confirmPromotionSchema, promotionSchema } from '@blog/contracts'
import { PromotionParamsSchema } from './promotion.schema.ts'
import type { PromotionService } from './promotion.service.ts'

export class PromotionController {
  constructor(private readonly service: PromotionService) {}

  async confirm(request: FastifyRequest, reply: FastifyReply) {
    const { id } = PromotionParamsSchema.parse(request.params)
    confirmPromotionSchema.parse(request.body)
    return reply.send(promotionSchema.parse(await this.service.confirm(request.viewer, id)))
  }

  async get(request: FastifyRequest, reply: FastifyReply) {
    const { id } = PromotionParamsSchema.parse(request.params)
    return reply.send(promotionSchema.parse(await this.service.get(request.viewer, id)))
  }
}
