import type { FastifyReply, FastifyRequest } from 'fastify'
import { feedPageSchema } from '@blog/contracts'
import { FeedQuerySchema } from './feed.schema.ts'
import type { FeedService } from './feed.service.ts'

export class FeedController {
  constructor(private readonly service: FeedService) {}

  async get(request: FastifyRequest, reply: FastifyReply) {
    const query = FeedQuerySchema.parse(request.query)
    return reply.send(feedPageSchema.parse(await this.service.getPage(request.viewer, query)))
  }
}
