import type { FastifyPluginAsync } from 'fastify'
import type { ConversationController } from './conversation.controller.ts'

export type ConversationRoutesOptions = { controller: ConversationController }

/** Свои диалоги. Гость получает 401. `unread-count` регистрируется раньше параметрических путей. */
export const conversationRoutes: FastifyPluginAsync<ConversationRoutesOptions> = async (app, { controller }) => {
  app.get('/v1/conversations/unread-count', (request, reply) => controller.unread(request, reply))
  app.get('/v1/conversations', (request, reply) => controller.list(request, reply))
  app.patch('/v1/conversations/:id', (request, reply) => controller.read(request, reply))
  app.post('/v1/conversations/:id/read', (request, reply) => controller.read(request, reply))
}
