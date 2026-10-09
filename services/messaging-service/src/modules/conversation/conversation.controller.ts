import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { conversationPageSchema, unreadCountSchema } from '@blog/contracts'
import { conversationQuerySchema } from './conversation.schema.ts'
import type { ConversationService } from './conversation.service.ts'

const idParamsSchema = z.object({ id: z.uuid() })

export function createConversationController(service: ConversationService) {
  return {
    async list(request: FastifyRequest, reply: FastifyReply) {
      const query = conversationQuerySchema.parse(request.query)
      return reply.send(conversationPageSchema.parse(await service.list(request.viewer, query)))
    },
    async unread(request: FastifyRequest, reply: FastifyReply) {
      return reply.send(unreadCountSchema.parse(await service.unreadCount(request.viewer)))
    },
    async read(request: FastifyRequest, reply: FastifyReply) {
      const params = idParamsSchema.parse(request.params)
      await service.markRead(request.viewer, params.id)
      return reply.status(204).send()
    },
  }
}
