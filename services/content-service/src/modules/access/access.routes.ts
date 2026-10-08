import type { FastifyPluginAsync } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { accessParamsSchema, articleAccessSchema } from './access.schema.ts'
import { createAccessRepository } from './access.repository.ts'
import { createAccessService } from './access.service.ts'

export type AccessRoutesOptions = { database: DbHandle }

/** `GET /internal/articles/{id}/access` — решение владельца статьи для gateway (фильтр живых кадров) и соседних сервисов. */
export const accessRoutes: FastifyPluginAsync<AccessRoutesOptions> = async (app, options) => {
  const service = createAccessService(createAccessRepository(options.database.db))
  app.get('/internal/articles/:article_id/access', async (request, reply) => {
    const { article_id } = accessParamsSchema.parse(request.params)
    const access = await service.getAccess(request.viewer, article_id)
    return reply.send(articleAccessSchema.parse(access))
  })
}
