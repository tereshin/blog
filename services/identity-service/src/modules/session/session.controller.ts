import type { FastifyReply, FastifyRequest } from 'fastify'
import { ActiveSessionSchema, SessionParamsSchema } from './session.schema.ts'
import type { SessionService } from './session.service.ts'

export class SessionController {
  constructor(private readonly service: SessionService) {}

  async get(request: FastifyRequest, reply: FastifyReply) {
    const { session_id } = SessionParamsSchema.parse(request.params)
    const session = await this.service.getActiveSession(session_id)
    return reply.send(ActiveSessionSchema.parse(session))
  }
}
