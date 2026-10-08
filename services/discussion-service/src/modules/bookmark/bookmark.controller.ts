import type { FastifyReply, FastifyRequest } from 'fastify'
import { bookmarkPageSchema, bookmarkStateSchema } from '@blog/contracts'
import { bookmarkParamsSchema, bookmarkQuerySchema } from './bookmark.schema.ts'
import type { BookmarkService } from './bookmark.types.ts'

export function createBookmarkController(service: BookmarkService) {
  return {
    async put(request: FastifyRequest, reply: FastifyReply) {
      const params = bookmarkParamsSchema.parse(request.params)
      return reply.send(bookmarkStateSchema.parse(await service.put(request.viewer, params.article_id, request.correlation_id)))
    },
    async remove(request: FastifyRequest, reply: FastifyReply) {
      const params = bookmarkParamsSchema.parse(request.params)
      return reply.send(bookmarkStateSchema.parse(await service.remove(request.viewer, params.article_id, request.correlation_id)))
    },
    async list(request: FastifyRequest, reply: FastifyReply) {
      const query = bookmarkQuerySchema.parse(request.query)
      return reply.send(bookmarkPageSchema.parse(await service.list(request.viewer, query)))
    },
  }
}
