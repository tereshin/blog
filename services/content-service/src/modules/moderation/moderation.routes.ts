import type { FastifyPluginAsync } from 'fastify'
import type { ModerationController } from './moderation.controller.ts'

export type ModerationRoutesOptions = { controller: ModerationController }

/** Модерация статей и жалоб: администратор и суперадминистратор. */
export const moderationRoutes: FastifyPluginAsync<ModerationRoutesOptions> = async (app, { controller }) => {
  app.get('/v1/moderation/articles/reports', (request, reply) => controller.reports(request, reply))
  app.get('/v1/moderation/articles', (request, reply) => controller.list(request, reply))
  app.post('/v1/articles/:id/hide', (request, reply) => controller.hide(request, reply))
  app.post('/v1/articles/:id/restore', (request, reply) => controller.restore(request, reply))
  app.delete('/v1/moderation/articles/:id', (request, reply) => controller.remove(request, reply))
  app.patch('/v1/reports/:id', (request, reply) => controller.review(request, reply))
}
