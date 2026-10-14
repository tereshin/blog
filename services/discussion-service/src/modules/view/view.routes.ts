import type { FastifyPluginAsync } from 'fastify'
import type { ViewController } from './view.controller.ts'

export type ViewRoutesOptions = { controller: ViewController }

/** `POST /v1/articles/:article_id/views` — один просмотр зрителя за 30 минут. */
export const viewRoutes: FastifyPluginAsync<ViewRoutesOptions> = async (app, { controller }) => {
  app.post('/v1/articles/:article_id/views', (request, reply) => controller.record(request, reply))
}
