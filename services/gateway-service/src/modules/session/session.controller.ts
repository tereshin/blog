import type { FastifyReply, FastifyRequest } from 'fastify'
import { SERVICE_CONTEXT_HEADER } from '@blog/contracts'
import { CORRELATION_ID_HEADER, IDEMPOTENCY_KEY_HEADER, REQUEST_ID_HEADER } from '@blog/http-kit'
import { SESSION_ID_HEADER } from './session.constants.ts'
import { clearSessionCookie } from './session.cookies.ts'
import type { CookieNames } from './session.cookies.ts'
import type { SessionService } from './session.service.ts'

function upstreamHeaders(request: FastifyRequest): Record<string, string> {
  const headers: Record<string, string> = {
    [SERVICE_CONTEXT_HEADER]: request.viewer_session.service_context_jwt,
    [REQUEST_ID_HEADER]: request.request_id,
    [CORRELATION_ID_HEADER]: request.correlation_id,
  }
  if (request.idempotency_key) headers[IDEMPOTENCY_KEY_HEADER] = request.idempotency_key
  if (request.viewer_session.session_id) headers[SESSION_ID_HEADER] = request.viewer_session.session_id
  return headers
}

export class SessionController {
  constructor(
    private readonly service: SessionService,
    private readonly cookies: CookieNames,
  ) {}

  async session(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(await this.service.readSession(request.viewer_session, upstreamHeaders(request)))
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    await this.service.logout(request.viewer_session.session_id, upstreamHeaders(request))
    clearSessionCookie(reply, this.cookies)
    return reply.code(204).send()
  }
}
