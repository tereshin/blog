import type { FastifyReply, FastifyRequest } from 'fastify'
import { articleCardsSchema, articleDraftListSchema, articleDraftSchema, articleSchema, createArticleSchema, updateArticleSchema } from '@blog/contracts'
import { ArticleIdParamsSchema, ArticleIdsQuerySchema, ArticleParamsSchema, MyArticlesQuerySchema } from './article.schema.ts'
import type { ArticleService } from './article.service.ts'
import type { ArticleWriteService } from './article.write.service.ts'

type ArticleWriteUseCases = Pick<ArticleWriteService<never>, 'create' | 'update' | 'publish' | 'remove' | 'getDraft' | 'listDrafts'>

export class ArticleController {
  constructor(
    private readonly reads: ArticleService,
    private readonly writes: ArticleWriteUseCases,
  ) {}

  async bySlug(request: FastifyRequest, reply: FastifyReply) {
    const params = ArticleParamsSchema.parse(request.params)
    return reply.send(articleSchema.parse(await this.reads.getBySlug(request.viewer, params.slug)))
  }

  async byIds(request: FastifyRequest, reply: FastifyReply) {
    const query = ArticleIdsQuerySchema.parse(request.query)
    return reply.send(articleCardsSchema.parse(await this.reads.getByIds(request.viewer, query.ids)))
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createArticleSchema.parse(request.body)
    return reply.code(201).send(articleDraftSchema.parse(await this.writes.create(request.viewer, body)))
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = ArticleIdParamsSchema.parse(request.params)
    const body = updateArticleSchema.parse(request.body)
    return reply.send(articleDraftSchema.parse(await this.writes.update(request.viewer, id, body, request.correlation_id)))
  }

  async publish(request: FastifyRequest, reply: FastifyReply) {
    const { id } = ArticleIdParamsSchema.parse(request.params)
    return reply.send(articleDraftSchema.parse(await this.writes.publish(request.viewer, id, request.correlation_id)))
  }

  async remove(request: FastifyRequest, reply: FastifyReply) {
    const { id } = ArticleIdParamsSchema.parse(request.params)
    await this.writes.remove(request.viewer, id, request.correlation_id)
    return reply.code(204).send()
  }

  async draft(request: FastifyRequest, reply: FastifyReply) {
    const { id } = ArticleIdParamsSchema.parse(request.params)
    return reply.send(articleDraftSchema.parse(await this.writes.getDraft(request.viewer, id)))
  }

  async myDrafts(request: FastifyRequest, reply: FastifyReply) {
    MyArticlesQuerySchema.parse(request.query)
    return reply.send(articleDraftListSchema.parse({ items: await this.writes.listDrafts(request.viewer) }))
  }
}
