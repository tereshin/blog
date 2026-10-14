import type { FastifyPluginAsync } from 'fastify'
import type { NotificationController } from './notification.controller.ts'

export type NotificationRoutesOptions = { controller: NotificationController }

/** Свои уведомления. Гость получает 401. */
export const notificationRoutes: FastifyPluginAsync<NotificationRoutesOptions> = async (app, { controller }) => {
  app.get('/v1/notifications', (request, reply) => controller.list(request, reply))
  app.get('/v1/notifications/unread-count', (request, reply) => controller.unread(request, reply))
  app.patch('/v1/notifications', (request, reply) => controller.readAll(request, reply))
  app.post('/v1/notifications/read-all', (request, reply) => controller.readAll(request, reply))
  app.patch('/v1/notifications/:id', (request, reply) => controller.readOne(request, reply))
  app.post('/v1/notifications/:id/read', (request, reply) => controller.readOne(request, reply))
}
