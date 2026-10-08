import type { FastifyReply, FastifyRequest } from 'fastify'
import { activeSessionSchema, sessionParamsSchema } from './session.schema.ts'
import type { SessionService } from './session.service.ts'

export function createSessionController(service: SessionService) {
  return {
    async get(request: FastifyRequest, reply: FastifyReply) {
      const { session_id } = sessionParamsSchema.parse(request.params)
      const session = await service.getActiveSession(session_id)
      return reply.send(activeSessionSchema.parse(session))
    },
  }
}
