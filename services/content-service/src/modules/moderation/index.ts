import type { FastifyPluginAsync } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createModerationController } from './moderation.controller.ts'
import { createModerationRepository } from './moderation.repository.ts'

export type ModerationRoutesOptions = { database: DbHandle }

/** Модерация статей и жалоб: администратор и суперадминистратор. */
export const moderationRoutes: FastifyPluginAsync<ModerationRoutesOptions> = async (app, options) => {
  const controller = createModerationController(createModerationRepository(options.database.db))
  app.get('/v1/moderation/articles', (request, reply) => controller.list(request, reply))
  app.post('/v1/articles/:id/hide', (request, reply) => controller.hide(request, reply))
  app.post('/v1/articles/:id/restore', (request, reply) => controller.restore(request, reply))
  app.delete('/v1/moderation/articles/:id', (request, reply) => controller.remove(request, reply))
  app.patch('/v1/reports/:id', (request, reply) => controller.review(request, reply))
}

export { createModerationService } from './moderation.service.ts'
