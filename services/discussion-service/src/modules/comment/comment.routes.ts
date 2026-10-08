import type { FastifyPluginAsync } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createCommentController } from './comment.controller.ts'
import { createCommentRepository } from './comment.repository.ts'
import { createCommentService } from './comment.service.ts'

export type CommentRoutesOptions = { database: DbHandle }

/** `GET /v1/comments/popular` — до 10 самых популярных комментариев статей, доступных зрителю. */
export const commentRoutes: FastifyPluginAsync<CommentRoutesOptions> = async (app, options) => {
  const controller = createCommentController(createCommentService(createCommentRepository(options.database.db)))
  app.get('/v1/comments/popular', (request, reply) => controller.popular(request, reply))
  app.get('/v1/articles/:article_id/comments', (request, reply) => controller.list(request, reply))
}
