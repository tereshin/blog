import type { FastifyPluginAsync } from 'fastify'
import type { ArticleController } from './article.controller.ts'

export type ArticleRoutesOptions = { controller: ArticleController }

/** Чтение статьи и запись черновика: создание, правка, публикация, удаление. */
export const articleRoutes: FastifyPluginAsync<ArticleRoutesOptions> = async (app, { controller }) => {
  app.post('/v1/articles', (request, reply) => controller.create(request, reply))
  app.get('/v1/me/articles', (request, reply) => controller.myDrafts(request, reply))
  app.get('/v1/articles/:id/draft', (request, reply) => controller.draft(request, reply))
  app.post('/v1/articles/:id/publish', (request, reply) => controller.publish(request, reply))
  app.patch('/v1/articles/:id', (request, reply) => controller.update(request, reply))
  app.delete('/v1/articles/:id', (request, reply) => controller.remove(request, reply))
  app.get('/v1/articles', (request, reply) => controller.byIds(request, reply))
  app.get('/v1/articles/:slug', (request, reply) => controller.bySlug(request, reply))
}
