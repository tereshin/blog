import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { commentSchema, commentTreePageSchema, createCommentSchema, popularCommentListSchema, updateCommentSchema, userCommentPageSchema } from '@blog/contracts'
import { commentIdParamsSchema, commentParamsSchema, commentQuerySchema } from './comment.schema.ts'
import type { CommentService } from './comment.types.ts'

const userParamsSchema = z.object({ user_id: z.uuid() })
const userQuerySchema = commentQuerySchema.extend({ sort: z.enum(['fresh', 'popular']).default('fresh') })

function idempotencyKey(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  return raw && raw.length > 0 && raw.length <= 200 ? raw : null
}

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
    async create(request: FastifyRequest, reply: FastifyReply) {
      const params = commentParamsSchema.parse(request.params)
      const body = createCommentSchema.parse(request.body)
      const comment = await service.create({
        viewer: request.viewer,
        article_id: params.article_id,
        body: body.body,
        parent_id: body.parent_id,
        idempotency_key: idempotencyKey(request.headers['x-idempotency-key']),
        correlation_id: request.correlation_id,
      })
      return reply.status(201).send(commentSchema.parse(comment))
    },
    async update(request: FastifyRequest, reply: FastifyReply) {
      const params = commentIdParamsSchema.parse(request.params)
      const body = updateCommentSchema.parse(request.body)
      const comment = await service.update({
        viewer: request.viewer,
        comment_id: params.id,
        body: body.body,
        idempotency_key: idempotencyKey(request.headers['x-idempotency-key']),
        correlation_id: request.correlation_id,
      })
      return reply.send(commentSchema.parse(comment))
    },
    async remove(request: FastifyRequest, reply: FastifyReply) {
      const params = commentIdParamsSchema.parse(request.params)
      const comment = await service.remove({
        viewer: request.viewer,
        comment_id: params.id,
        idempotency_key: idempotencyKey(request.headers['x-idempotency-key']),
        correlation_id: request.correlation_id,
      })
      return reply.send(commentSchema.parse(comment))
    },
  }
}
