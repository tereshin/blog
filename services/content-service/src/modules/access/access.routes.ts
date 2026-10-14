import type { FastifyPluginAsync } from 'fastify'
import type { AccessController } from './access.controller.ts'

export type AccessRoutesOptions = { controller: AccessController }

/** `GET /internal/articles/{id}/access` — решение владельца статьи для gateway (фильтр живых кадров) и соседних сервисов. */
export const accessRoutes: FastifyPluginAsync<AccessRoutesOptions> = async (app, { controller }) => {
  app.get('/internal/articles/:article_id/access', (request, reply) => controller.get(request, reply))
}
