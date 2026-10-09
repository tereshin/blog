import type { FastifyPluginAsync } from 'fastify'
import type { Env } from '../../config/env.ts'
import type { DbHandle } from '../../infra/db/client.ts'
import { createAuthController } from './auth.controller.ts'
import { createAuthRepository } from './auth.repository.ts'
import { createAuthService } from './auth.service.ts'
import { createFirebaseGateway } from './firebase-admin.ts'
import type { FirebaseGateway } from './firebase-admin.ts'

export type AuthRoutesOptions = { database: DbHandle; env: Env; firebase?: FirebaseGateway }

/**
 * Вход через Firebase. Cookie браузера сюда не доходит: её ставит gateway
 * по заголовку `x-set-session` на `POST /v1/auth/sessions`.
 */
export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (app, options) => {
  const { env } = options
  const firebase =
    options.firebase ??
    createFirebaseGateway({
      project_id: env.FIREBASE_PROJECT_ID,
      server_api_key: env.FIREBASE_SERVER_API_KEY,
      client_email: env.FIREBASE_CLIENT_EMAIL,
      private_key: env.FIREBASE_PRIVATE_KEY,
      emulator_host: env.FIREBASE_AUTH_EMULATOR_HOST,
    })
  const service = createAuthService({
    repository: createAuthRepository(options.database.db),
    firebase,
    superadmin_email: env.SUPERADMIN_EMAIL,
    session_ttl_days: env.SESSION_TTL_DAYS,
    web_api_key: env.FIREBASE_WEB_API_KEY,
    auth_domain: env.FIREBASE_AUTH_DOMAIN,
    project_id: env.FIREBASE_PROJECT_ID,
    emulator_host: env.FIREBASE_AUTH_EMULATOR_HOST ?? null,
    seed_password: env.SEED_AUTH_PASSWORD ?? null,
  })
  const controller = createAuthController(service)
  const open = { config: { is_public: true } }
  app.get('/v1/auth/config', open, (request, reply) => controller.config(request, reply))
  app.post('/v1/auth/registrations', open, (request, reply) => controller.register(request, reply))
  app.post('/v1/auth/sessions', open, (request, reply) => controller.signIn(request, reply))
  app.post('/v1/auth/email-claims', open, (request, reply) => controller.claimEmail(request, reply))
  app.post('/v1/auth/email-verifications', open, (request, reply) => controller.sendVerification(request, reply))
  app.post('/v1/auth/email-verification-confirmations', open, (request, reply) => controller.confirmVerification(request, reply))
  app.post('/v1/auth/password-resets', open, (request, reply) => controller.requestPasswordReset(request, reply))
  app.post('/v1/auth/password-reset-confirmations', open, (request, reply) => controller.confirmPasswordReset(request, reply))
  app.post('/v1/auth/logout', open, (request, reply) => controller.logout(request, reply))
  app.get('/v1/auth/session', open, (request, reply) => controller.session(request, reply))
}
