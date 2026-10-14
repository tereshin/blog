import type { FastifyPluginAsync } from 'fastify'
import type { BookmarkController } from './bookmark.controller.ts'

export type BookmarkRoutesOptions = { controller: BookmarkController }

/** Закладки участника: поставить, снять, список идентификаторов. */
export const bookmarkRoutes: FastifyPluginAsync<BookmarkRoutesOptions> = async (app, { controller }) => {
  app.put('/v1/bookmarks/:article_id', (request, reply) => controller.put(request, reply))
  app.delete('/v1/bookmarks/:article_id', (request, reply) => controller.remove(request, reply))
  app.get('/v1/bookmarks', (request, reply) => controller.list(request, reply))
}
