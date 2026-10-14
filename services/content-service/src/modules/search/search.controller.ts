import type { FastifyReply, FastifyRequest } from 'fastify'
import { searchResponseSchema } from '@blog/contracts'
import { SearchQuerySchema } from './search.schema.ts'
import type { SearchService } from './search.service.ts'

export class SearchController {
  constructor(private readonly service: SearchService) {}

  async get(request: FastifyRequest, reply: FastifyReply) {
    const query = SearchQuerySchema.parse(request.query)
    return reply.send(searchResponseSchema.parse(await this.service.search(request.viewer, query)))
  }
}
