import type { FastifyPluginAsync } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createSessionController } from './session.controller.ts'
import { createSessionRepository } from './session.repository.ts'
import { createSessionService } from './session.service.ts'

export type SessionRoutesOptions = { database: DbHandle }

/**
 * `GET /internal/sessions/{id}` — только для gateway по внутренней сети (снаружи `/internal/*` не проксируется).
 * Контекст зрителя тут ещё не существует: gateway как раз его собирает, поэтому маршрут помечен `is_public`.
 */
export const sessionRoutes: FastifyPluginAsync<SessionRoutesOptions> = async (app, options) => {
  const controller = createSessionController(createSessionService(createSessionRepository(options.database.db)))
  app.get('/internal/sessions/:session_id', { config: { is_public: true } }, (request, reply) => controller.get(request, reply))
}
