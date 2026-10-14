import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  commentBookmarkPageSchema,
  commentBookmarkStateSchema,
  commentReactorPageSchema,
  commentReportPageSchema,
  commentReportSchema,
  createCommentReportSchema,
  discussionSubscriptionSchema,
  mentionSearchSchema,
  moderationFiltersSchema,
  pageQuerySchema,
  reviewCommentReportSchema,
} from '@blog/contracts'
import { CommentInteractionParamsSchema, MentionQuerySchema, ReactorsQuerySchema } from './comment-interaction.schema.ts'
import type { CommentInteractionService } from './comment-interaction.service.ts'

export class CommentInteractionController {
  constructor(private readonly service: CommentInteractionService) {}

  async bookmarks(request: FastifyRequest, reply: FastifyReply) {
    const query = pageQuerySchema.parse(request.query)
    return reply.send(commentBookmarkPageSchema.parse(await this.service.bookmarks(request.viewer, query)))
  }

  async mentions(request: FastifyRequest, reply: FastifyReply) {
    const { q } = MentionQuerySchema.parse(request.query)
    return reply.send(mentionSearchSchema.parse(await this.service.mentions(request.viewer, q)))
  }

  async bookmark(request: FastifyRequest, reply: FastifyReply) {
    return this.setBookmark(request, reply, true)
  }

  async unbookmark(request: FastifyRequest, reply: FastifyReply) {
    return this.setBookmark(request, reply, false)
  }

  async reactors(request: FastifyRequest, reply: FastifyReply) {
    const query = ReactorsQuerySchema.parse(request.query)
    const { id } = CommentInteractionParamsSchema.parse(request.params)
    return reply.send(commentReactorPageSchema.parse(await this.service.reactors(request.viewer, id, query.kind, query)))
  }

  async report(request: FastifyRequest, reply: FastifyReply) {
    const { id } = CommentInteractionParamsSchema.parse(request.params)
    const { reason } = createCommentReportSchema.parse(request.body)
    return reply.status(201).send(commentReportSchema.parse(await this.service.report(request.viewer, id, reason)))
  }

  async reports(request: FastifyRequest, reply: FastifyReply) {
    const filters = moderationFiltersSchema.parse(request.query)
    return reply.send(commentReportPageSchema.parse(await this.service.reports(request.viewer, filters)))
  }

  async review(request: FastifyRequest, reply: FastifyReply) {
    const { id } = CommentInteractionParamsSchema.parse(request.params)
    const { action } = reviewCommentReportSchema.parse(request.body)
    return reply.send(commentReportSchema.parse(await this.service.review(request.viewer, id, action, request.correlation_id)))
  }

  async subscription(request: FastifyRequest, reply: FastifyReply) {
    return this.setSubscription(request, reply, undefined)
  }

  async subscribe(request: FastifyRequest, reply: FastifyReply) {
    return this.setSubscription(request, reply, true)
  }

  async unsubscribe(request: FastifyRequest, reply: FastifyReply) {
    return this.setSubscription(request, reply, false)
  }

  private async setBookmark(request: FastifyRequest, reply: FastifyReply, is_saved: boolean) {
    const { id } = CommentInteractionParamsSchema.parse(request.params)
    return reply.send(commentBookmarkStateSchema.parse(await this.service.bookmark(request.viewer, id, is_saved)))
  }

  /** `enabled === undefined` — только прочитать состояние подписки. */
  private async setSubscription(request: FastifyRequest, reply: FastifyReply, enabled: boolean | undefined) {
    const { id } = CommentInteractionParamsSchema.parse(request.params)
    return reply.send(discussionSubscriptionSchema.parse(await this.service.subscription(request.viewer, id, enabled)))
  }
}
