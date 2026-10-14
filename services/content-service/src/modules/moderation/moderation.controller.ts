import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  moderationArticleQuerySchema,
  moderationFiltersSchema,
  moderationReportPageSchema,
  moderationPageSchema,
  reportSchema,
  reviewReportSchema,
} from '@blog/contracts'
import { ArticleStatusResponseSchema, ModerationIdParamsSchema } from './moderation.schema.ts'
import type { ModerationService } from './moderation.service.ts'

type ModerationUseCases = Pick<ModerationService<never>, 'list' | 'listReports' | 'hide' | 'restore' | 'remove' | 'review'>

export class ModerationController {
  constructor(private readonly service: ModerationUseCases) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = moderationArticleQuerySchema.parse(request.query)
    return reply.send(moderationPageSchema.parse(await this.service.list(request.viewer, query.filter, query)))
  }

  async reports(request: FastifyRequest, reply: FastifyReply) {
    const query = moderationFiltersSchema.parse(request.query)
    return reply.send(moderationReportPageSchema.parse(await this.service.listReports(request.viewer, query)))
  }

  async hide(request: FastifyRequest, reply: FastifyReply) {
    const params = ModerationIdParamsSchema.parse(request.params)
    const article = await this.service.hide(request.viewer, params.id, request.correlation_id)
    return reply.send(ArticleStatusResponseSchema.parse({ id: article.id, status: article.status }))
  }

  async restore(request: FastifyRequest, reply: FastifyReply) {
    const params = ModerationIdParamsSchema.parse(request.params)
    const article = await this.service.restore(request.viewer, params.id, request.correlation_id)
    return reply.send(ArticleStatusResponseSchema.parse({ id: article.id, status: article.status }))
  }

  async remove(request: FastifyRequest, reply: FastifyReply) {
    const params = ModerationIdParamsSchema.parse(request.params)
    await this.service.remove(request.viewer, params.id, request.correlation_id)
    return reply.status(204).send()
  }

  async review(request: FastifyRequest, reply: FastifyReply) {
    const params = ModerationIdParamsSchema.parse(request.params)
    const body = reviewReportSchema.parse(request.body)
    const action = 'action' in body ? body.action : 'dismiss'
    return reply.send(reportSchema.parse(await this.service.review(request.viewer, params.id, action, request.correlation_id)))
  }
}
