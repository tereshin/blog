import type { FastifyReply, FastifyRequest } from 'fastify'
import { feedPageSchema } from '@blog/contracts'
import { feedQuerySchema } from './feed.schema.ts'
import type { FeedService } from './feed.service.ts'

export function createFeedController(service: FeedService) {
  return {
    async get(request: FastifyRequest, reply: FastifyReply) {
      const query = feedQuerySchema.parse(request.query)
      return reply.send(feedPageSchema.parse(await service.getPage(request.viewer, query)))
    },
  }
}
