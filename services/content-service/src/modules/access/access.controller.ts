import type { FastifyReply, FastifyRequest } from 'fastify'
import { AccessParamsSchema, ArticleAccessSchema } from './access.schema.ts'
import type { AccessService } from './access.service.ts'

export class AccessController {
  constructor(private readonly service: AccessService) {}

  async get(request: FastifyRequest, reply: FastifyReply) {
    const { article_id } = AccessParamsSchema.parse(request.params)
    return reply.send(ArticleAccessSchema.parse(await this.service.getAccess(request.viewer, article_id)))
  }
}
