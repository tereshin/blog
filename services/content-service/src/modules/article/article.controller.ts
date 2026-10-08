import type { FastifyReply, FastifyRequest } from 'fastify'
import { articleCardsSchema, articleSchema } from '@blog/contracts'
import { articleIdsQuerySchema, articleParamsSchema } from './article.schema.ts'
import type { ArticleService } from './article.types.ts'

export function createArticleController(service: ArticleService) {
  return {
    async bySlug(request: FastifyRequest, reply: FastifyReply) {
      const params = articleParamsSchema.parse(request.params)
      return reply.send(articleSchema.parse(await service.getBySlug(request.viewer, params.slug)))
    },
    async byIds(request: FastifyRequest, reply: FastifyReply) {
      const query = articleIdsQuerySchema.parse(request.query)
      return reply.send(articleCardsSchema.parse(await service.getByIds(request.viewer, query.ids)))
    },
  }
}
