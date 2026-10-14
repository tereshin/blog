import type { FastifyPluginAsync } from 'fastify'
import type { SeenController } from './seen.controller.ts'

export type SeenRoutesOptions = { controller: SeenController }

/** Просмотренные карточки ленты. На счётчик просмотров статьи не влияет. */
export const seenRoutes: FastifyPluginAsync<SeenRoutesOptions> = async (app, { controller }) => {
  app.put('/v1/feed-seen', (request, reply) => controller.mark(request, reply))
  app.get('/v1/feed-seen', (request, reply) => controller.list(request, reply))
}
