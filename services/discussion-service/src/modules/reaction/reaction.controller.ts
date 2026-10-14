import type { FastifyReply, FastifyRequest } from 'fastify'
import type { PublicApi } from '../../shared/public-api.ts'
import { CreateReactionSchema, ReactionResponseSchema } from './reaction.schema.ts'
import type { ReactionService } from './reaction.service.ts'

export class ReactionController {
  constructor(private readonly service: PublicApi<ReactionService<unknown>>) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = CreateReactionSchema.parse(request.body)
    const response = await this.service.react({
      viewer: request.viewer,
      body,
      idempotency_key: request.idempotency_key,
      correlation_id: request.correlation_id,
    })
    return reply.send(ReactionResponseSchema.parse(response))
  }
}
