import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  emailCodeConfirmBodySchema, emailCodeConfirmedSchema, emailCodeStepSchema,
  emailFlowBodySchema, emailFlowIdSchema, emailFlowResponseSchema, passwordSetupBodySchema,
} from '@blog/contracts'
import { SET_SESSION_HEADER, SET_SESSION_MAX_AGE_HEADER } from './auth.constants.ts'
import type { EmailFlowService } from './email-flow.service.ts'

export class EmailFlowController {
  constructor(private readonly service: EmailFlowService) {}

  async start(request: FastifyRequest, reply: FastifyReply) {
    return reply.code(200).header('Cache-Control', 'no-store')
      .send(emailFlowResponseSchema.parse(await this.service.start(emailFlowBodySchema.parse(request.body))))
  }

  async resend(request: FastifyRequest, reply: FastifyReply) {
    const { flow_id } = emailFlowIdSchema.parse(request.body)
    return reply.header('Cache-Control', 'no-store').send(emailCodeStepSchema.parse(await this.service.resend(flow_id)))
  }

  async confirm(request: FastifyRequest, reply: FastifyReply) {
    const { flow_id, code } = emailCodeConfirmBodySchema.parse(request.body)
    return reply.header('Cache-Control', 'no-store').send(emailCodeConfirmedSchema.parse(await this.service.confirm(flow_id, code)))
  }

  async complete(request: FastifyRequest, reply: FastifyReply) {
    const { flow_id, password } = passwordSetupBodySchema.parse(request.body)
    const session = await this.service.complete(flow_id, password, request.correlation_id)
    return reply.header(SET_SESSION_HEADER, session.session_id)
      .header(SET_SESSION_MAX_AGE_HEADER, String(session.max_age_seconds)).code(204).send()
  }
}
