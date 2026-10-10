import type { FastifyReply, FastifyRequest } from 'fastify'
import { SESSION_ID_HEADER } from '@blog/contracts'
import { SET_SESSION_HEADER, SET_SESSION_MAX_AGE_HEADER } from './auth.constants.ts'
import {
  authConfigSchema,
  authOkSchema,
  createSessionBodySchema,
  emailClaimBodySchema,
  emailVerificationConfirmBodySchema,
  guestSessionSchema,
  identityMemberSessionSchema,
  passwordResetBodySchema,
  passwordResetConfirmBodySchema,
  pendingAuthSchema,
  registrationBodySchema,
} from './auth.schema.ts'
import type { AuthService } from './auth.service.ts'

function sessionId(request: FastifyRequest): string | undefined {
  const value = request.headers[SESSION_ID_HEADER]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function idempotencyKey(request: FastifyRequest): string | null {
  const value = request.headers['x-idempotency-key']
  return typeof value === 'string' && value.length > 0 ? value : null
}

export function createAuthController(service: AuthService) {
  return {
    async config(_request: FastifyRequest, reply: FastifyReply) {
      return reply.send(authConfigSchema.parse(await service.config()))
    },

    async register(request: FastifyRequest, reply: FastifyReply) {
      const body = registrationBodySchema.parse(request.body)
      const result = await service.register({
        email: body.email,
        password: body.password,
        ...(body.display_name !== undefined ? { display_name: body.display_name } : {}),
        idempotency_key: idempotencyKey(request),
        correlation_id: request.correlation_id,
      })
      return reply.code(200).send(pendingAuthSchema.parse(result))
    },

    async signIn(request: FastifyRequest, reply: FastifyReply) {
      const body = createSessionBodySchema.parse(request.body)
      const result = await service.signIn({ body, correlation_id: request.correlation_id })
      return reply
        .header(SET_SESSION_HEADER, result.session_id)
        .header(SET_SESSION_MAX_AGE_HEADER, String(result.max_age_seconds))
        .code(204)
        .send()
    },

    async claimEmail(request: FastifyRequest, reply: FastifyReply) {
      const body = emailClaimBodySchema.parse(request.body)
      const result = await service.claimEmail({
        session_id: sessionId(request),
        email: body.email,
        idempotency_key: idempotencyKey(request),
      })
      return reply.code(200).send(pendingAuthSchema.parse(result))
    },

    async sendVerification(request: FastifyRequest, reply: FastifyReply) {
      return reply.send(authOkSchema.parse(await service.sendVerification(sessionId(request))))
    },

    async confirmVerification(request: FastifyRequest, reply: FastifyReply) {
      const body = emailVerificationConfirmBodySchema.parse(request.body)
      return reply.send(authOkSchema.parse(await service.confirmVerification(body.oob_code)))
    },

    async requestPasswordReset(request: FastifyRequest, reply: FastifyReply) {
      const body = passwordResetBodySchema.parse(request.body)
      return reply.send(authOkSchema.parse(await service.requestPasswordReset(body.email)))
    },

    async confirmPasswordReset(request: FastifyRequest, reply: FastifyReply) {
      const body = passwordResetConfirmBodySchema.parse(request.body)
      return reply.send(authOkSchema.parse(await service.confirmPasswordReset(body)))
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
