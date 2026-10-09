import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { messagePageSchema, messageSchema, sendMessageSchema } from '@blog/contracts'
import { messageQuerySchema } from './message.schema.ts'
import type { MessageService } from './message.service.ts'

const conversationParamsSchema = z.object({ id: z.uuid() })
const peerParamsSchema = z.object({ peer_user_id: z.uuid() })

function idempotencyKey(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  return raw && raw.length > 0 && raw.length <= 200 ? raw : null
}

export function createMessageController(service: MessageService) {
  return {
    async list(request: FastifyRequest, reply: FastifyReply) {
      const params = conversationParamsSchema.parse(request.params)
      const query = messageQuerySchema.parse(request.query)
      return reply.send(messagePageSchema.parse(await service.list(request.viewer, params.id, query)))
    },
    async send(request: FastifyRequest, reply: FastifyReply) {
      const params = peerParamsSchema.parse(request.params)
      const body = sendMessageSchema.parse(request.body)
      const message = await service.send({
        viewer: request.viewer,
        peer_user_id: params.peer_user_id,
        body: body.body,
        idempotency_key: idempotencyKey(request.headers['x-idempotency-key']),
        correlation_id: request.correlation_id,
      })
      return reply.status(201).send(messageSchema.parse(message))
    },
  }
}
