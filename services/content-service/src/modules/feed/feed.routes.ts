import type { FastifyPluginAsync } from 'fastify'
import type { FeedController } from './feed.controller.ts'

export type FeedRoutesOptions = { controller: FeedController }

/** `GET /v1/feed?mode=fresh|popular|mine|topic:{slug}&cursor=` — порции по 20 карточек и `next_cursor`. */
export const feedRoutes: FastifyPluginAsync<FeedRoutesOptions> = async (app, { controller }) => {
  app.get('/v1/feed', (request, reply) => controller.get(request, reply))
}
