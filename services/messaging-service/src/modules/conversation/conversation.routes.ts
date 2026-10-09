import type { FastifyPluginAsync } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createConversationController } from './conversation.controller.ts'
import { createConversationRepository } from './conversation.repository.ts'
import { createConversationService } from './conversation.service.ts'

export type ConversationRoutesOptions = { database: DbHandle }

/** Свои диалоги. Гость получает 401. `unread-count` регистрируется раньше параметрических путей. */
export const conversationRoutes: FastifyPluginAsync<ConversationRoutesOptions> = async (app, options) => {
  const controller = createConversationController(createConversationService(createConversationRepository(options.database.db)))
  app.get('/v1/conversations/unread-count', (request, reply) => controller.unread(request, reply))
  app.get('/v1/conversations', (request, reply) => controller.list(request, reply))
  app.post('/v1/conversations/:id/read', (request, reply) => controller.read(request, reply))
}
