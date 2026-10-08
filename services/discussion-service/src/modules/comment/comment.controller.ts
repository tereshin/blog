import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { commentTreePageSchema, popularCommentListSchema, userCommentPageSchema } from '@blog/contracts'
import { commentParamsSchema, commentQuerySchema } from './comment.schema.ts'
import type { CommentService } from './comment.types.ts'

const userParamsSchema = z.object({ user_id: z.uuid() })
const userQuerySchema = commentQuerySchema.extend({ sort: z.enum(['fresh', 'popular']).default('fresh') })

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
    async byAuthor(request: FastifyRequest, reply: FastifyReply) {
      const params = userParamsSchema.parse(request.params)
      const query = userQuerySchema.parse(request.query)
      return reply.send(userCommentPageSchema.parse(await service.listByAuthor(request.viewer, params.user_id, query.sort, query)))
    },
  }
}
