import type { FastifyPluginAsync } from 'fastify'
import type { Env } from '../../config/env.ts'
import type { DbHandle } from '../../infra/db/client.ts'
import { createAuthController } from './auth.controller.ts'
import { createAuthRepository } from './auth.repository.ts'
import { createAuthService } from './auth.service.ts'
import { createGoogleClient } from './google-client.ts'

export type AuthRoutesOptions = { database: DbHandle; env: Env }

/**
 * Вход через издателя `GOOGLE_ISSUER_URL`. Маршруты публичные для служебного JWT:
 * на старте входа сессии ещё нет, а cookie браузера сюда не доходит — её ставит gateway.
 */
export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (app, options) => {
  const { env } = options
  const service = createAuthService({
    repository: createAuthRepository(options.database.db),
    google: createGoogleClient({
      issuer_url: env.GOOGLE_ISSUER_URL,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
    }),
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    superadmin_email: env.SUPERADMIN_EMAIL,
    session_ttl_days: env.SESSION_TTL_DAYS,
  })
  const controller = createAuthController(service)
  const open = { config: { is_public: true } }
  app.get('/v1/auth/google', open, (request, reply) => controller.start(request, reply))
  app.get('/v1/auth/google/callback', open, (request, reply) => controller.callback(request, reply))
  app.post('/v1/auth/logout', open, (request, reply) => controller.logout(request, reply))
  app.get('/v1/auth/session', open, (request, reply) => controller.session(request, reply))
}
