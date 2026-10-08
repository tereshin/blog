import type { FastifyPluginAsync } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createFeedController } from './feed.controller.ts'
import { createFeedRepository } from './feed.repository.ts'
import { createFeedService } from './feed.service.ts'

export type FeedRoutesOptions = { database: DbHandle }

/** `GET /v1/feed?mode=fresh|popular|mine|topic:{slug}&cursor=` — порции по 20 карточек и `next_cursor`. */
export const feedRoutes: FastifyPluginAsync<FeedRoutesOptions> = async (app, options) => {
  const controller = createFeedController(createFeedService(createFeedRepository(options.database.db)))
  app.get('/v1/feed', (request, reply) => controller.get(request, reply))
}
