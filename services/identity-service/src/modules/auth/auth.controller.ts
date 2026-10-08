import type { FastifyReply, FastifyRequest } from 'fastify'
import { authCallbackErrorSchema, authCallbackSuccessSchema } from '@blog/contracts'
import { SESSION_ID_HEADER } from '@blog/contracts'
import { guestSessionSchema, identityMemberSessionSchema, startQuerySchema } from './auth.schema.ts'
import type { AuthService } from './auth.service.ts'

function sessionId(request: FastifyRequest): string | undefined {
  const value = request.headers[SESSION_ID_HEADER]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export function createAuthController(service: AuthService) {
  return {
    async start(request: FastifyRequest, reply: FastifyReply) {
      const query = startQuerySchema.parse(request.query)
      const redirect_to = await service.start(query.return_to)
      return reply.redirect(redirect_to.toString())
    },

    async callback(request: FastifyRequest, reply: FastifyReply) {
      const search = new URL(request.raw.url ?? request.url, 'http://identity.local').search
      const result = await service.complete(search, request.correlation_id)
      if (!result.ok) return reply.code(403).send(authCallbackErrorSchema.parse({ error: result.error, return_to: result.return_to }))
      return reply
        .header('x-set-session', result.session_id)
        .header('x-set-session-max-age', String(result.max_age_seconds))
        .send(authCallbackSuccessSchema.parse({ session_id: result.session_id, return_to: result.return_to }))
    },

    async logout(request: FastifyRequest, reply: FastifyReply) {
      await service.logout(sessionId(request), request.correlation_id)
      return reply.code(204).send()
    },

    async session(request: FastifyRequest, reply: FastifyReply) {
      const current = await service.current(sessionId(request))
      if (current.status === 'guest') return reply.send(guestSessionSchema.parse(current))
      return reply.send(identityMemberSessionSchema.parse(current))
    },
  }
}
