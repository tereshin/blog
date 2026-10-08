import type { FastifyPluginAsync } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createSettingsController } from './settings.controller.ts'
import { createSettingsRepository } from './settings.repository.ts'
import { createSettingsService } from './settings.service.ts'

export type SettingsRoutesOptions = { database: DbHandle; media_url: string }

/** Публичные поля открыты всем. Закрытые флаги и сохранение — только суперадминистратору. */
export const settingsRoutes: FastifyPluginAsync<SettingsRoutesOptions> = async (app, options) => {
  const controller = createSettingsController(createSettingsService(createSettingsRepository(options.database.db), { media_url: options.media_url }))
  app.get('/v1/settings/admin', (request, reply) => controller.getAdmin(request, reply))
  app.get('/v1/settings', (request, reply) => controller.getPublic(request, reply))
  app.put('/v1/settings', (request, reply) => controller.update(request, reply))
}
