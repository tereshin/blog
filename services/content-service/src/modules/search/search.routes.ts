import type { FastifyPluginAsync } from 'fastify'
import type { SearchController } from './search.controller.ts'

export type SearchRoutesOptions = { controller: SearchController }

/** `GET /v1/search?q=` — статьи по полнотекстовому вектору, люди по триграммам, активные темы по подстроке. */
export const searchRoutes: FastifyPluginAsync<SearchRoutesOptions> = async (app, { controller }) => {
  app.get('/v1/search', (request, reply) => controller.get(request, reply))
}
