import type { Readable } from 'node:stream'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { clearSessionCookie, setSessionCookie } from '../session/index.ts'
import type { CookieNames } from '../session/index.ts'
import { firstHeader } from '../../shared/first-header.ts'
import { filterResponseHeaders } from './proxy.headers.ts'
import type { ProxyService } from './proxy.service.ts'

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export class ProxyController {
  constructor(
    private readonly service: ProxyService,
    private readonly cookies: CookieNames,
  ) {}

  async forward(request: FastifyRequest, reply: FastifyReply) {
    const entry = this.service.routeFor(request.url)
    const { viewer_session } = request
    const headers = this.service.upstreamHeaders(entry, {
      headers: request.headers,
      service_context_jwt: viewer_session.service_context_jwt,
      request_id: request.request_id,
      correlation_id: request.correlation_id,
      ip: request.ip,
      session_id: viewer_session.session_id,
    })

    const raw_length = firstHeader(request.headers['content-length'])
    const result = await this.service.forward({
      entry,
      method: request.method,
      url: request.raw.url ?? request.url,
      headers,
      body: METHODS_WITH_BODY.has(request.method) ? (request.body as Readable | undefined) : undefined,
      content_length: raw_length === undefined ? undefined : Number(raw_length),
    })

    const bridge = this.service.sessionBridge(entry, result.headers)
    if (bridge.action === 'set') setSessionCookie(reply, this.cookies, bridge.session_id, bridge.max_age_seconds)
    else if (bridge.action === 'clear') clearSessionCookie(reply, this.cookies)

    return reply.code(result.status).headers(filterResponseHeaders(result.headers)).send(result.body)
  }
}
