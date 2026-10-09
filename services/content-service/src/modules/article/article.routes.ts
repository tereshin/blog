import type { FastifyPluginAsync } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createArticleController } from './article.controller.ts'
import { createArticleRepository } from './article.repository.ts'
import { createArticleService } from './article.service.ts'
import type { FileOwner } from './article.sanitizer.ts'

export type ArticleRoutesOptions = {
  database: DbHandle
  media_urls: readonly string[]
  lookupFile: (url: string) => Promise<FileOwner | null>
}

/** Чтение статьи и запись черновика: создание, правка, публикация, удаление. */
export const articleRoutes: FastifyPluginAsync<ArticleRoutesOptions> = async (app, options) => {
  const controller = createArticleController(
    createArticleService(createArticleRepository(options.database.db), {
      media_urls: options.media_urls,
      lookupFile: options.lookupFile,
    }),
  )
  app.post('/v1/articles', (request, reply) => controller.create(request, reply))
  app.get('/v1/me/articles', (request, reply) => controller.myDrafts(request, reply))
  app.get('/v1/articles/:id/draft', (request, reply) => controller.draft(request, reply))
  app.post('/v1/articles/:id/publish', (request, reply) => controller.publish(request, reply))
  app.patch('/v1/articles/:id', (request, reply) => controller.update(request, reply))
  app.delete('/v1/articles/:id', (request, reply) => controller.remove(request, reply))
  app.get('/v1/articles', (request, reply) => controller.byIds(request, reply))
  app.get('/v1/articles/:slug', (request, reply) => controller.bySlug(request, reply))
}
