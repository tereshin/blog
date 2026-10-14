import type { FastifyPluginAsync } from 'fastify'
import type { SessionController } from './session.controller.ts'

export type SessionRoutesOptions = { controller: SessionController }

/**
 * Сессия и выход. `POST /v1/auth/sessions` идёт общим прокси: identity просит cookie
 * заголовком `x-set-session`, gateway ставит её и не отдаёт `session_id` браузеру.
 */
export const sessionRoutes: FastifyPluginAsync<SessionRoutesOptions> = async (app, { controller }) => {
  app.get('/v1/auth/session', (request, reply) => controller.session(request, reply))
  app.post('/v1/auth/logout', (request, reply) => controller.logout(request, reply))
  app.delete('/v1/sessions/current', (request, reply) => controller.logout(request, reply))
}
