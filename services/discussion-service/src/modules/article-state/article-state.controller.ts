import type { FastifyReply, FastifyRequest } from 'fastify'
import { articleStatesSchema } from '@blog/contracts'
import { articleStatesQuerySchema } from './article-state.schema.ts'
import type { ArticleStateService } from './article-state.service.ts'

export function createArticleStateController(service: ArticleStateService) {
  return {
    async get(request: FastifyRequest, reply: FastifyReply) {
      const query = articleStatesQuerySchema.parse(request.query)
      return reply.send(articleStatesSchema.parse(await service.get(request.viewer, query.article_ids)))
    },
  }
}
