import type { FastifyPluginAsync } from 'fastify'
import type { EmailFlowController } from './email-flow.controller.ts'

export const emailFlowRoutes: FastifyPluginAsync<{ controller: EmailFlowController }> = async (app, { controller }) => {
  const open = { config: { is_public: true } }
  app.post('/v1/auth/email-flows', open, (request, reply) => controller.start(request, reply))
  app.post('/v1/auth/email-code-resends', open, (request, reply) => controller.resend(request, reply))
  app.post('/v1/auth/email-code-confirmations', open, (request, reply) => controller.confirm(request, reply))
  app.post('/v1/auth/password-setups', open, (request, reply) => controller.complete(request, reply))
}
