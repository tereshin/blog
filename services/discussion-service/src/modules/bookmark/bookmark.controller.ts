import type { FastifyReply, FastifyRequest } from 'fastify'
import { bookmarkPageSchema, bookmarkStateSchema } from '@blog/contracts'
import type { PublicApi } from '../../shared/public-api.ts'
import { BookmarkParamsSchema, BookmarkQuerySchema } from './bookmark.schema.ts'
import type { BookmarkService } from './bookmark.service.ts'

export class BookmarkController {
  constructor(private readonly service: PublicApi<BookmarkService<unknown>>) {}

  async put(request: FastifyRequest, reply: FastifyReply) {
    const params = BookmarkParamsSchema.parse(request.params)
    return reply.send(bookmarkStateSchema.parse(await this.service.put(request.viewer, params.article_id, request.correlation_id)))
  }

  async remove(request: FastifyRequest, reply: FastifyReply) {
    const params = BookmarkParamsSchema.parse(request.params)
    return reply.send(bookmarkStateSchema.parse(await this.service.remove(request.viewer, params.article_id, request.correlation_id)))
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = BookmarkQuerySchema.parse(request.query)
    return reply.send(bookmarkPageSchema.parse(await this.service.list(request.viewer, query)))
  }
}
