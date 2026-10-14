import type { FastifyReply, FastifyRequest } from 'fastify'
import { notificationPageSchema, notificationSchema, unreadCountSchema } from '@blog/contracts'
import { NotificationParamsSchema, NotificationQuerySchema } from './notification.schema.ts'
import type { NotificationService } from './notification.service.ts'

/** HTTP-методы сервиса не зависят от типа транзакции, поэтому контроллер не параметризуется. */
type NotificationUseCases = Pick<NotificationService<unknown>, 'list' | 'unreadCount' | 'markRead' | 'markAllRead'>

export class NotificationController {
  constructor(private readonly service: NotificationUseCases) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = NotificationQuerySchema.parse(request.query)
    return reply.send(notificationPageSchema.parse(await this.service.list(request.viewer, query)))
  }

  async unread(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(unreadCountSchema.parse(await this.service.unreadCount(request.viewer)))
  }

  async readOne(request: FastifyRequest, reply: FastifyReply) {
    const { id } = NotificationParamsSchema.parse(request.params)
    return reply.send(notificationSchema.parse(await this.service.markRead(request.viewer, id)))
  }

  async readAll(request: FastifyRequest, reply: FastifyReply) {
    await this.service.markAllRead(request.viewer)
    return reply.status(204).send()
  }
}
