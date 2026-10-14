import type { FastifyPluginAsync } from 'fastify'
import type { MediaController } from './media.controller.ts'

export type MediaRoutesOptions = { controller: MediaController }

/** Тело `POST /v1/media` — сам файл, не JSON. Разбор содержимого делает сервис. */
export const mediaRoutes: FastifyPluginAsync<MediaRoutesOptions> = async (app, { controller }) => {
  app.removeAllContentTypeParsers()
  app.addContentTypeParser('*', (_request, payload, done) => done(null, payload))

  app.post('/v1/media', (request, reply) => controller.upload(request, reply))
  app.get('/internal/files/content', { config: { is_public: true } }, (request, reply) => controller.content(request, reply))
  app.get('/internal/files', { config: { is_public: true } }, (request, reply) => controller.lookup(request, reply))
}
