import type { FastifyReply, FastifyRequest } from 'fastify'
import { feedSeenListSchema, feedSeenSchema } from '@blog/contracts'
import { SeenBodySchema, SeenQuerySchema } from './seen.schema.ts'
import type { SeenService } from './seen.service.ts'

export class SeenController {
  constructor(private readonly service: SeenService) {}

  async mark(request: FastifyRequest, reply: FastifyReply) {
    const body = SeenBodySchema.parse(request.body)
    return reply.send(feedSeenSchema.parse(await this.service.mark(request.viewer, body)))
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = SeenQuerySchema.parse(request.query)
    return reply.send(feedSeenListSchema.parse(await this.service.list(request.viewer, query.feed_key)))
  }
}
