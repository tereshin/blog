import type { FastifyReply, FastifyRequest } from 'fastify'
import { notificationPageSchema, notificationSchema, unreadCountSchema } from '@blog/contracts'
import { notificationQuerySchema } from './notification.schema.ts'
import type { NotificationService } from './notification.service.ts'

export function createNotificationController(service: NotificationService) {
  return {
    async list(request: FastifyRequest, reply: FastifyReply) {
      const query = notificationQuerySchema.parse(request.query)
      return reply.send(notificationPageSchema.parse(await service.list(request.viewer, query)))
    },
    async unread(request: FastifyRequest, reply: FastifyReply) {
      return reply.send(unreadCountSchema.parse(await service.unreadCount(request.viewer)))
    },
    async readOne(request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as { id: string }
      return reply.send(notificationSchema.parse(await service.markRead(request.viewer, id)))
    },
    async readAll(request: FastifyRequest, reply: FastifyReply) {
      await service.markAllRead(request.viewer)
      return reply.status(204).send()
    },
  }
}
