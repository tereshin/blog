import type { FastifyReply, FastifyRequest } from 'fastify'
import { reactionResponseSchema } from '@blog/contracts'
import { createReactionSchema } from './reaction.schema.ts'
import type { ReactionService } from './reaction.service.ts'

function idempotencyKey(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  return raw && raw.length > 0 && raw.length <= 200 ? raw : null
}

export function createReactionController(service: ReactionService) {
  return {
    async create(request: FastifyRequest, reply: FastifyReply) {
      const body = createReactionSchema.parse(request.body)
      const response = await service.react({
        viewer: request.viewer,
        body,
        idempotency_key: idempotencyKey(request.headers['x-idempotency-key']),
        correlation_id: request.correlation_id,
      })
      return reply.send(reactionResponseSchema.parse(response))
    },
  }
}
