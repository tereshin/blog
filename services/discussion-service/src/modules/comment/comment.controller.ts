import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  commentSchema,
  commentThreadSchema,
  commentTreePageSchema,
  createCommentSchema,
  popularCommentListSchema,
  updateCommentSchema,
  userCommentPageSchema,
} from '@blog/contracts'
import {
  CommentIdParamsSchema,
  CommentParamsSchema,
  CommentQuerySchema,
  UserCommentsQuerySchema,
  UserParamsSchema,
} from './comment.schema.ts'
import type { CommentService } from './comment.service.ts'

export class CommentController {
  constructor(private readonly service: CommentService) {}

  async popular(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(popularCommentListSchema.parse(await this.service.getPopular(request.viewer)))
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const params = CommentParamsSchema.parse(request.params)
    const query = CommentQuerySchema.parse(request.query)
    return reply.send(
      commentTreePageSchema.parse(
        await this.service.listForArticle(request.viewer, params.article_id, query),
      ),
    )
  }

  async replies(request: FastifyRequest, reply: FastifyReply) {
    const { id } = CommentIdParamsSchema.parse(request.params)
    return reply.send(
      commentTreePageSchema.parse(
        await this.service.listReplyPage(request.viewer, id, CommentQuerySchema.parse(request.query)),
      ),
    )
  }

  async thread(request: FastifyRequest, reply: FastifyReply) {
    const { id } = CommentIdParamsSchema.parse(request.params)
    return reply.send(commentThreadSchema.parse(await this.service.getThread(request.viewer, id)))
  }

  async byAuthor(request: FastifyRequest, reply: FastifyReply) {
    const params = UserParamsSchema.parse(request.params)
    const query = UserCommentsQuerySchema.parse(request.query)
    return reply.send(
      userCommentPageSchema.parse(
        await this.service.listByAuthor(request.viewer, params.user_id, query.sort, query),
      ),
    )
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const params = CommentParamsSchema.parse(request.params)
    const body = createCommentSchema.parse(request.body)
    const comment = await this.service.create({
      viewer: request.viewer,
      article_id: params.article_id,
      body: body.body,
      media: body.media,
      mentions: body.mentions,
      parent_id: body.parent_id,
      idempotency_key: request.idempotency_key,
      correlation_id: request.correlation_id,
    })
    return reply.status(201).send(commentSchema.parse(comment))
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const params = CommentIdParamsSchema.parse(request.params)
    const body = updateCommentSchema.parse(request.body)
    const comment = await this.service.update({
      viewer: request.viewer,
      comment_id: params.id,
      body: body.body,
      idempotency_key: request.idempotency_key,
      correlation_id: request.correlation_id,
    })
    return reply.send(commentSchema.parse(comment))
  }

  async remove(request: FastifyRequest, reply: FastifyReply) {
    const params = CommentIdParamsSchema.parse(request.params)
    const comment = await this.service.remove({
      viewer: request.viewer,
      comment_id: params.id,
      idempotency_key: request.idempotency_key,
      correlation_id: request.correlation_id,
    })
    return reply.send(commentSchema.parse(comment))
  }

  async hide(request: FastifyRequest, reply: FastifyReply) {
    const params = CommentIdParamsSchema.parse(request.params)
    const comment = await this.service.hide({
      viewer: request.viewer,
      comment_id: params.id,
      correlation_id: request.correlation_id,
    })
    return reply.send(commentSchema.parse(comment))
  }

  async restore(request: FastifyRequest, reply: FastifyReply) {
    const params = CommentIdParamsSchema.parse(request.params)
    const comment = await this.service.restore({
      viewer: request.viewer,
      comment_id: params.id,
      correlation_id: request.correlation_id,
    })
    return reply.send(commentSchema.parse(comment))
  }

  async moderateRemove(request: FastifyRequest, reply: FastifyReply) {
    const params = CommentIdParamsSchema.parse(request.params)
    const comment = await this.service.moderateRemove({
      viewer: request.viewer,
      comment_id: params.id,
      correlation_id: request.correlation_id,
    })
    return reply.send(commentSchema.parse(comment))
  }
}
