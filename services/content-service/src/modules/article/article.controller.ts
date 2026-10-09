import type { FastifyReply, FastifyRequest } from 'fastify'
import { articleCardsSchema, articleDraftListSchema, articleDraftSchema, articleSchema, createArticleSchema, updateArticleSchema } from '@blog/contracts'
import { articleIdParamsSchema, articleIdsQuerySchema, articleParamsSchema, myArticlesQuerySchema } from './article.schema.ts'
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
    async create(request: FastifyRequest, reply: FastifyReply) {
      const body = createArticleSchema.parse(request.body)
      return reply.code(201).send(articleDraftSchema.parse(await service.create(request.viewer, body, request.correlation_id)))
    },
    async update(request: FastifyRequest, reply: FastifyReply) {
      const { id } = articleIdParamsSchema.parse(request.params)
      const body = updateArticleSchema.parse(request.body)
      return reply.send(articleDraftSchema.parse(await service.update(request.viewer, id, body, request.correlation_id)))
    },
    async publish(request: FastifyRequest, reply: FastifyReply) {
      const { id } = articleIdParamsSchema.parse(request.params)
      return reply.send(articleDraftSchema.parse(await service.publish(request.viewer, id, request.correlation_id)))
    },
    async remove(request: FastifyRequest, reply: FastifyReply) {
      const { id } = articleIdParamsSchema.parse(request.params)
      await service.remove(request.viewer, id, request.correlation_id)
      return reply.code(204).send()
    },
    async draft(request: FastifyRequest, reply: FastifyReply) {
      const { id } = articleIdParamsSchema.parse(request.params)
      return reply.send(articleDraftSchema.parse(await service.getDraft(request.viewer, id)))
    },
    async myDrafts(request: FastifyRequest, reply: FastifyReply) {
      myArticlesQuerySchema.parse(request.query)
      return reply.send(articleDraftListSchema.parse({ items: await service.listDrafts(request.viewer) }))
    },
  }
}
