import type { FastifyPluginAsync } from 'fastify'
import type { SessionController } from './session.controller.ts'

export type SessionRoutesOptions = { controller: SessionController }

/**
 * `GET /internal/sessions/{id}` — только для gateway по внутренней сети (снаружи `/internal/*` не проксируется).
 * Контекст зрителя тут ещё не существует: gateway как раз его собирает, поэтому маршрут помечен `is_public`.
 */
export const sessionRoutes: FastifyPluginAsync<SessionRoutesOptions> = async (app, { controller }) => {
  app.get('/internal/sessions/:session_id', { config: { is_public: true } }, (request, reply) => controller.get(request, reply))
}
