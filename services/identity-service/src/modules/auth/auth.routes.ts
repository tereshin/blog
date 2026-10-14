import type { FastifyPluginAsync } from 'fastify'
import type { AuthController } from './auth.controller.ts'

export type AuthRoutesOptions = { controller: AuthController }

/**
 * Вход через Firebase. Cookie браузера сюда не доходит: её ставит gateway
 * по заголовку `x-set-session` на `POST /v1/auth/sessions`.
 */
export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (app, { controller }) => {
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
  app.delete('/v1/sessions/current', open, (request, reply) => controller.logout(request, reply))
  app.get('/v1/auth/session', open, (request, reply) => controller.session(request, reply))
}
