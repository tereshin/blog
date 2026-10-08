import type { FastifyPluginAsync } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createArticleStateController } from './article-state.controller.ts'
import { createArticleStateService } from './article-state.service.ts'

export type ArticleStateRoutesOptions = { database: DbHandle }

/** Состояния зрителя для карточек ленты: своя реакция и закладка, не больше 50 id. */
export const articleStateRoutes: FastifyPluginAsync<ArticleStateRoutesOptions> = async (app, options) => {
  const controller = createArticleStateController(createArticleStateService(options.database.db))
  app.get('/v1/me/article-states', (request, reply) => controller.get(request, reply))
}
