import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import type { MaintenanceService } from './maintenance.service.ts'

const AUTH_ROUTES = new Set([
  'GET /v1/auth/config',
  'GET /v1/auth/session',
  'POST /v1/auth/sessions',
  'POST /v1/auth/logout',
  'DELETE /v1/sessions/current',
  'POST /v1/auth/password-resets',
  'POST /v1/auth/password-reset-confirmations',
  'POST /v1/auth/email-verification-confirmations',
])

const maintenancePlugin: FastifyPluginAsync<{ service: MaintenanceService }> = async (
  app,
  { service },
) => {
  app.addHook('onRequest', async (request, reply) => {
    if (request.routeOptions.config.is_public) return
    const viewer = request.viewer_session.context
    if (viewer.role === 'admin' || viewer.role === 'superadmin') return
    const path = new URL(request.url, 'http://gateway').pathname.replace(/\/+$/, '') || '/'
    if (AUTH_ROUTES.has(`${request.method} ${path}`)) return
    if ((request.method === 'GET' || request.method === 'HEAD') && path === '/v1/settings') {
      reply.header('Cache-Control', 'no-store')
      return
    }
    const status = await service.status(request.viewer_session.service_context_jwt)
    if (!status.maintenance_enabled) return

    reply.code(503).header('Retry-After', '60').header('Cache-Control', 'no-store')
    if (path.startsWith('/v1/') || path === '/v1') {
      return reply.type('application/problem+json').send({
        type: 'about:blank',
        title: 'Maintenance',
        status: 503,
        code: 'maintenance',
        detail: 'The site is temporarily unavailable for maintenance.',
      })
    }
    reply.header('X-Robots-Tag', 'noindex, nofollow')
    // Keep the application bootstrap available so an administrator can sign in.
    return reply
      .type('text/html; charset=utf-8')
      .send(await service.page(status.locale, reply.csp_nonce))
  })
}

export const maintenanceModule = fp(maintenancePlugin, {
  name: 'gateway-maintenance',
  dependencies: ['gateway-session'],
})
