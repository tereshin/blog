import type { FastifyPluginAsync } from 'fastify'
import type { SettingsController } from './settings.controller.ts'

export type SettingsRoutesOptions = { controller: SettingsController }

/** Публичные поля открыты всем. Закрытые флаги и сохранение — только суперадминистратору. */
export const settingsRoutes: FastifyPluginAsync<SettingsRoutesOptions> = async (app, { controller }) => {
  app.get('/v1/settings/admin', (request, reply) => controller.getAdmin(request, reply))
  app.get('/v1/settings', (request, reply) => controller.getPublic(request, reply))
  app.put('/v1/settings', (request, reply) => controller.update(request, reply))
}
