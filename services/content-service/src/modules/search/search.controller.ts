import type { FastifyReply, FastifyRequest } from 'fastify'
import { searchResponseSchema } from '@blog/contracts'
import { searchQuerySchema } from './search.schema.ts'
import type { SearchService } from './search.service.ts'

export function createSearchController(service: SearchService) {
  return {
    async get(request: FastifyRequest, reply: FastifyReply) {
      const query = searchQuerySchema.parse(request.query)
      return reply.send(searchResponseSchema.parse(await service.search(request.viewer, query)))
    },
  }
}
