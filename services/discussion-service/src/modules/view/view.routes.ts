import type { FastifyPluginAsync } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createViewController } from './view.controller.ts'
import { createViewRepository } from './view.repository.ts'
import { createViewService } from './view.service.ts'

export type ViewRoutesOptions = { database: DbHandle }

/** `POST /v1/articles/:article_id/views` — один просмотр зрителя за 30 минут. */
export const viewRoutes: FastifyPluginAsync<ViewRoutesOptions> = async (app, options) => {
  const controller = createViewController(createViewService(createViewRepository(options.database.db)))
  app.post('/v1/articles/:article_id/views', (request, reply) => controller.record(request, reply))
}
