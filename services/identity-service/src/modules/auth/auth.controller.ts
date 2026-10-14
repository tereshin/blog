import type { FastifyReply, FastifyRequest } from 'fastify'
import { SESSION_ID_HEADER } from '@blog/contracts'
import { SET_SESSION_HEADER, SET_SESSION_MAX_AGE_HEADER } from './auth.constants.ts'
import {
  AuthConfigSchema,
  AuthOkSchema,
  CreateSessionBodySchema,
  EmailClaimBodySchema,
  EmailVerificationConfirmBodySchema,
  GuestSessionSchema,
  IdentityMemberSessionSchema,
  PasswordResetBodySchema,
  PasswordResetConfirmBodySchema,
  PendingAuthSchema,
  RegistrationBodySchema,
} from './auth.schema.ts'
import type { AuthService } from './auth.service.ts'

function sessionId(request: FastifyRequest): string | undefined {
  const value = request.headers[SESSION_ID_HEADER]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export class AuthController {
  constructor(private readonly service: AuthService) {}

  async config(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send(AuthConfigSchema.parse(await this.service.config()))
  }

  async register(request: FastifyRequest, reply: FastifyReply) {
    const body = RegistrationBodySchema.parse(request.body)
    const result = await this.service.register({
      email: body.email,
      password: body.password,
      ...(body.display_name !== undefined ? { display_name: body.display_name } : {}),
      idempotency_key: request.idempotency_key,
      correlation_id: request.correlation_id,
    })
    return reply.code(200).send(PendingAuthSchema.parse(result))
  }

  async signIn(request: FastifyRequest, reply: FastifyReply) {
    const body = CreateSessionBodySchema.parse(request.body)
    const result = await this.service.signIn({ body, correlation_id: request.correlation_id })
    return reply
      .header(SET_SESSION_HEADER, result.session_id)
      .header(SET_SESSION_MAX_AGE_HEADER, String(result.max_age_seconds))
      .code(204)
      .send()
  }

  async claimEmail(request: FastifyRequest, reply: FastifyReply) {
    const body = EmailClaimBodySchema.parse(request.body)
    const result = await this.service.claimEmail({
      session_id: sessionId(request),
      email: body.email,
      idempotency_key: request.idempotency_key,
    })
    return reply.code(200).send(PendingAuthSchema.parse(result))
  }

  async sendVerification(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(AuthOkSchema.parse(await this.service.sendVerification(sessionId(request))))
  }

  async confirmVerification(request: FastifyRequest, reply: FastifyReply) {
    const body = EmailVerificationConfirmBodySchema.parse(request.body)
    return reply.send(AuthOkSchema.parse(await this.service.confirmVerification(body.oob_code)))
  }

  async requestPasswordReset(request: FastifyRequest, reply: FastifyReply) {
    const body = PasswordResetBodySchema.parse(request.body)
    return reply.send(AuthOkSchema.parse(await this.service.requestPasswordReset(body.email)))
  }

  async confirmPasswordReset(request: FastifyRequest, reply: FastifyReply) {
    const body = PasswordResetConfirmBodySchema.parse(request.body)
    return reply.send(AuthOkSchema.parse(await this.service.confirmPasswordReset(body)))
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    await this.service.logout(sessionId(request), request.correlation_id)
    return reply.code(204).send()
  }

  async session(request: FastifyRequest, reply: FastifyReply) {
    const current = await this.service.current(sessionId(request))
    if (current.status === 'guest') return reply.send(GuestSessionSchema.parse(current))
    return reply.send(IdentityMemberSessionSchema.parse(current))
  }
}
