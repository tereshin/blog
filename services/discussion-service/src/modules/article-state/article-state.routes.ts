import type { FastifyPluginAsync } from 'fastify'
import type { ArticleStateController } from './article-state.controller.ts'

export type ArticleStateRoutesOptions = { controller: ArticleStateController }

/** Состояния зрителя для карточек ленты: своя реакция и закладка, не больше 50 id. */
export const articleStateRoutes: FastifyPluginAsync<ArticleStateRoutesOptions> = async (app, { controller }) => {
  app.get('/v1/me/article-states', (request, reply) => controller.get(request, reply))
}
