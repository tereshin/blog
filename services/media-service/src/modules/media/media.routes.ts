import type { FastifyPluginAsync } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createMediaController } from './media.controller.ts'
import { createMediaRepository } from './media.repository.ts'
import { createMediaService } from './media.service.ts'
import type { ObjectStore } from './media.types.ts'

export type MediaRoutesOptions = { database: DbHandle; store: ObjectStore; public_url: string }

/** Тело `POST /v1/media` — сам файл, не JSON. Разбор содержимого делает сервис. */
export const mediaRoutes: FastifyPluginAsync<MediaRoutesOptions> = async (app, options) => {
  app.removeAllContentTypeParsers()
  app.addContentTypeParser('*', (_request, payload, done) => done(null, payload))

  const controller = createMediaController(createMediaService(createMediaRepository(options.database.db), options.store, options.public_url))
  app.post('/v1/media', (request, reply) => controller.upload(request, reply))
  app.get('/internal/files', { config: { is_public: true } }, (request, reply) => controller.lookup(request, reply))
}
