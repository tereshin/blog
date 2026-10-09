import type { FastifyReply, FastifyRequest } from 'fastify'
import { feedSeenListSchema, feedSeenSchema } from '@blog/contracts'
import { seenBodySchema, seenQuerySchema } from './seen.schema.ts'
import type { SeenService } from './seen.types.ts'

export function createSeenController(service: SeenService) {
  return {
    async mark(request: FastifyRequest, reply: FastifyReply) {
      const body = seenBodySchema.parse(request.body)
      return reply.send(feedSeenSchema.parse(await service.mark(request.viewer, body)))
    },
    async list(request: FastifyRequest, reply: FastifyReply) {
      const query = seenQuerySchema.parse(request.query)
      return reply.send(feedSeenListSchema.parse(await service.list(request.viewer, query.feed_key)))
    },
  }
}
