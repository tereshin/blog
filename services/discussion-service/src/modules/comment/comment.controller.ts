import type { FastifyReply, FastifyRequest } from 'fastify'
import { popularCommentListSchema } from '@blog/contracts'
import type { CommentService } from './comment.service.ts'

export function createCommentController(service: CommentService) {
  return {
    async popular(request: FastifyRequest, reply: FastifyReply) {
      return reply.send(popularCommentListSchema.parse(await service.getPopular(request.viewer)))
    },
  }
}
