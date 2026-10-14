import type { FastifyReply, FastifyRequest } from 'fastify'
import { conversationPageSchema, unreadCountSchema } from '@blog/contracts'
import { ConversationParamsSchema, ConversationQuerySchema } from './conversation.schema.ts'
import type { ConversationService } from './conversation.service.ts'

export class ConversationController {
  constructor(private readonly service: ConversationService) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = ConversationQuerySchema.parse(request.query)
    return reply.send(conversationPageSchema.parse(await this.service.list(request.viewer, query)))
  }

  async unread(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(unreadCountSchema.parse(await this.service.unreadCount(request.viewer)))
  }

  async read(request: FastifyRequest, reply: FastifyReply) {
    const params = ConversationParamsSchema.parse(request.params)
    await this.service.markRead(request.viewer, params.id)
    return reply.status(204).send()
  }
}
