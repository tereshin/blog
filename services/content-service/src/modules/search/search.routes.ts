import type { FastifyPluginAsync } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createSearchController } from './search.controller.ts'
import { createSearchRepository } from './search.repository.ts'
import { createSearchService } from './search.service.ts'

export type SearchRoutesOptions = { database: DbHandle }

/** `GET /v1/search?q=` — статьи по полнотекстовому вектору, люди по триграммам, активные темы по подстроке. */
export const searchRoutes: FastifyPluginAsync<SearchRoutesOptions> = async (app, options) => {
  const controller = createSearchController(createSearchService(createSearchRepository(options.database.db)))
  app.get('/v1/search', (request, reply) => controller.get(request, reply))
}
