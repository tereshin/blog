import type { FastifyPluginAsync } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createCommentController } from './comment.controller.ts'
import { createCommentRepository } from './comment.repository.ts'
import { createCommentService } from './comment.service.ts'
import { createCommentWriter } from './comment.write.ts'

export type CommentRoutesOptions = {
  database: DbHandle
  lookup_file?: (url: string) => Promise<{ uploader_id: string; kind: string } | null>
}

/** `GET /v1/comments/popular` — до 10 самых популярных комментариев статей, доступных зрителю. */
export const commentRoutes: FastifyPluginAsync<CommentRoutesOptions> = async (app, options) => {
  const controller = createCommentController(
    createCommentService(
      createCommentRepository(options.database.db),
      createCommentWriter(options.database.db, options.lookup_file),
    ),
  )
  app.get('/v1/comments/popular', (request, reply) => controller.popular(request, reply))
  app.get('/v1/articles/:article_id/comments', (request, reply) => controller.list(request, reply))
  app.post('/v1/articles/:article_id/comments', (request, reply) =>
    controller.create(request, reply),
  )
  app.get('/v1/comments/:id/replies', (request, reply) => controller.replies(request, reply))
  app.get('/v1/comments/:id/thread', (request, reply) => controller.thread(request, reply))
  app.patch('/v1/comments/:id', (request, reply) => controller.update(request, reply))
  app.delete('/v1/comments/:id', (request, reply) => controller.remove(request, reply))
  app.post('/v1/comments/:id/hide', (request, reply) => controller.hide(request, reply))
  app.post('/v1/comments/:id/restore', (request, reply) => controller.restore(request, reply))
  app.delete('/v1/moderation/comments/:id', (request, reply) =>
    controller.moderateRemove(request, reply),
  )
  app.get('/v1/users/:user_id/comments', (request, reply) => controller.byAuthor(request, reply))
}
