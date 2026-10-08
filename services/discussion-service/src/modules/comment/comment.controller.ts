import type { FastifyReply, FastifyRequest } from 'fastify'
import { commentTreePageSchema, popularCommentListSchema } from '@blog/contracts'
import { commentParamsSchema, commentQuerySchema } from './comment.schema.ts'
import type { CommentService } from './comment.types.ts'

export function createCommentController(service: CommentService) {
  return {
    async popular(request: FastifyRequest, reply: FastifyReply) {
      return reply.send(popularCommentListSchema.parse(await service.getPopular(request.viewer)))
    },
    async list(request: FastifyRequest, reply: FastifyReply) {
      const params = commentParamsSchema.parse(request.params)
      const query = commentQuerySchema.parse(request.query)
      return reply.send(commentTreePageSchema.parse(await service.listForArticle(request.viewer, params.article_id, query)))
    },
  }
}
