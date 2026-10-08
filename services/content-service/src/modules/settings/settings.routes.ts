import type { FastifyPluginAsync } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createSettingsRepository } from './settings.repository.ts'
import { publicSettingsSchema } from './settings.schema.ts'
import { createSettingsService } from './settings.service.ts'

export type SettingsRoutesOptions = { database: DbHandle }

/** `GET /v1/settings` — публичные поля; закрытые (регистрация, список администраторов) не отдаются. */
export const settingsRoutes: FastifyPluginAsync<SettingsRoutesOptions> = async (app, options) => {
  const service = createSettingsService(createSettingsRepository(options.database.db))
  app.get('/v1/settings', async (_request, reply) => reply.send(publicSettingsSchema.parse(await service.getPublic())))
}
