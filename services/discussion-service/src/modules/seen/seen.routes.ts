import type { FastifyPluginAsync } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createSeenController } from './seen.controller.ts'
import { createSeenRepository } from './seen.repository.ts'
import { createSeenService } from './seen.service.ts'

export type SeenRoutesOptions = { database: DbHandle }

/** Просмотренные карточки ленты. На счётчик просмотров статьи не влияет. */
export const seenRoutes: FastifyPluginAsync<SeenRoutesOptions> = async (app, options) => {
  const controller = createSeenController(createSeenService(createSeenRepository(options.database.db)))
  app.put('/v1/feed-seen', (request, reply) => controller.mark(request, reply))
  app.get('/v1/feed-seen', (request, reply) => controller.list(request, reply))
}
