import type { FastifyPluginAsync } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createNotificationController } from './notification.controller.ts'
import { createNotificationRepository } from './notification.repository.ts'
import { createNotificationService } from './notification.service.ts'

export type NotificationRoutesOptions = { database: DbHandle }

/** Свои уведомления. Гость получает 401. */
export const notificationRoutes: FastifyPluginAsync<NotificationRoutesOptions> = async (app, options) => {
  const controller = createNotificationController(createNotificationService(createNotificationRepository(options.database.db)))
  app.get('/v1/notifications', (request, reply) => controller.list(request, reply))
  app.get('/v1/notifications/unread-count', (request, reply) => controller.unread(request, reply))
  app.post('/v1/notifications/read-all', (request, reply) => controller.readAll(request, reply))
  app.post('/v1/notifications/:id/read', (request, reply) => controller.readOne(request, reply))
}
