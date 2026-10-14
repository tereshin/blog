import type { FastifyReply, FastifyRequest } from 'fastify'
import { messagePageSchema, messageSchema } from '@blog/contracts'
import { ConversationParamsSchema, MessageQuerySchema, PeerParamsSchema, SendMessageBodySchema } from './message.schema.ts'
import type { MessageService } from './message.service.ts'

/** Публичные методы сервиса не зависят от типа транзакции, поэтому контроллер не параметризуется. */
type MessageUseCases = Pick<MessageService<unknown>, 'list' | 'send'>

export class MessageController {
  constructor(private readonly service: MessageUseCases) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    const params = ConversationParamsSchema.parse(request.params)
    const query = MessageQuerySchema.parse(request.query)
    return reply.send(messagePageSchema.parse(await this.service.list(request.viewer, params.id, query)))
  }

  async send(request: FastifyRequest, reply: FastifyReply) {
    const params = PeerParamsSchema.parse(request.params)
    const body = SendMessageBodySchema.parse(request.body)
    const message = await this.service.send({
      viewer: request.viewer,
      peer_user_id: params.peer_user_id,
      body: body.body,
      idempotency_key: request.idempotency_key,
      correlation_id: request.correlation_id,
    })
    return reply.status(201).send(messageSchema.parse(message))
  }
}
