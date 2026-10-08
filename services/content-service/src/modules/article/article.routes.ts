import type { FastifyPluginAsync } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createArticleController } from './article.controller.ts'
import { createArticleRepository } from './article.repository.ts'
import { createArticleService } from './article.service.ts'

export type ArticleRoutesOptions = { database: DbHandle }

/** Чтение статьи по адресу и карточек по списку идентификаторов. */
export const articleRoutes: FastifyPluginAsync<ArticleRoutesOptions> = async (app, options) => {
  const controller = createArticleController(createArticleService(createArticleRepository(options.database.db)))
  app.get('/v1/articles', (request, reply) => controller.byIds(request, reply))
  app.get('/v1/articles/:slug', (request, reply) => controller.bySlug(request, reply))
}
