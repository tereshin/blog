import type { FastifyReply, FastifyRequest } from 'fastify'
import { articleStatesSchema } from '@blog/contracts'
import { ArticleStatesQuerySchema } from './article-state.schema.ts'
import type { ArticleStateService } from './article-state.service.ts'

export class ArticleStateController {
  constructor(private readonly service: ArticleStateService) {}

  async get(request: FastifyRequest, reply: FastifyReply) {
    const query = ArticleStatesQuerySchema.parse(request.query)
    return reply.send(articleStatesSchema.parse(await this.service.get(request.viewer, query.article_ids)))
  }
}
