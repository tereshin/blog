import type { FastifyPluginAsync } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createMessageController } from './message.controller.ts'
import { createMessageRepository } from './message.repository.ts'
import { createMessageService } from './message.service.ts'

export type MessageRoutesOptions = { database: DbHandle }

/** Сообщения диалога и отправка. Гость получает 401. */
export const messageRoutes: FastifyPluginAsync<MessageRoutesOptions> = async (app, options) => {
  const controller = createMessageController(createMessageService(createMessageRepository(options.database.db)))
  app.get('/v1/conversations/:id/messages', (request, reply) => controller.list(request, reply))
  app.post('/v1/conversations/with/:peer_user_id/messages', (request, reply) => controller.send(request, reply))
}
