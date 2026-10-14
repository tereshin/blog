import type { FastifyPluginAsync } from 'fastify'
import type { CommentInteractionController } from './comment-interaction.controller.ts'

export type CommentInteractionRoutesOptions = { controller: CommentInteractionController }

/** Закладки, реакции, жалобы, подписки и упоминания вокруг комментариев. */
export const commentInteractionRoutes: FastifyPluginAsync<CommentInteractionRoutesOptions> = async (app, { controller }) => {
  app.get('/v1/comments/bookmarks', (request, reply) => controller.bookmarks(request, reply))
  app.get('/v1/comments/mentions', (request, reply) => controller.mentions(request, reply))
  app.put('/v1/comments/:id/bookmark', (request, reply) => controller.bookmark(request, reply))
  app.delete('/v1/comments/:id/bookmark', (request, reply) => controller.unbookmark(request, reply))
  app.get('/v1/comments/:id/reactors', (request, reply) => controller.reactors(request, reply))
  app.post('/v1/comments/:id/reports', (request, reply) => controller.report(request, reply))
  app.get('/v1/moderation/comments/reports', (request, reply) => controller.reports(request, reply))
  app.patch('/v1/moderation/comments/reports/:id', (request, reply) => controller.review(request, reply))
  app.get('/v1/comments/subscriptions/:id', (request, reply) => controller.subscription(request, reply))
  app.put('/v1/comments/subscriptions/:id', (request, reply) => controller.subscribe(request, reply))
  app.delete('/v1/comments/subscriptions/:id', (request, reply) => controller.unsubscribe(request, reply))
}
