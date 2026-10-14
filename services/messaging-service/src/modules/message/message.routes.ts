import type { FastifyPluginAsync } from 'fastify'
import type { MessageController } from './message.controller.ts'

export type MessageRoutesOptions = { controller: MessageController }

/** Сообщения диалога и отправка. Гость получает 401. */
export const messageRoutes: FastifyPluginAsync<MessageRoutesOptions> = async (app, { controller }) => {
  app.get('/v1/conversations/:id/messages', (request, reply) => controller.list(request, reply))
  app.post('/v1/conversations/with/:peer_user_id/messages', (request, reply) => controller.send(request, reply))
}
