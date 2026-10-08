import type { FastifyPluginAsync } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createBookmarkController } from './bookmark.controller.ts'
import { createBookmarkRepository } from './bookmark.repository.ts'
import { createBookmarkService } from './bookmark.service.ts'

export type BookmarkRoutesOptions = { database: DbHandle }

/** Закладки участника: поставить, снять, список идентификаторов. */
export const bookmarkRoutes: FastifyPluginAsync<BookmarkRoutesOptions> = async (app, options) => {
  const controller = createBookmarkController(createBookmarkService(createBookmarkRepository(options.database.db)))
  app.put('/v1/bookmarks/:article_id', (request, reply) => controller.put(request, reply))
  app.delete('/v1/bookmarks/:article_id', (request, reply) => controller.remove(request, reply))
  app.get('/v1/bookmarks', (request, reply) => controller.list(request, reply))
}
