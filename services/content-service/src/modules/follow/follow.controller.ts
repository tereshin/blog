import type { FastifyReply, FastifyRequest } from 'fastify'
import { followStateSchema, followStatesSchema } from '@blog/contracts'
import { FollowBodySchema, FollowQuerySchema } from './follow.schema.ts'
import type { FollowService } from './follow.service.ts'

export class FollowController {
  constructor(private readonly service: FollowService) {}

  async follow(request: FastifyRequest, reply: FastifyReply) {
    const body = FollowBodySchema.parse(request.body)
    return reply.send(followStateSchema.parse(await this.service.follow(request.viewer, body)))
  }

  async unfollow(request: FastifyRequest, reply: FastifyReply) {
    const body = FollowBodySchema.parse(request.body)
    return reply.send(followStateSchema.parse(await this.service.unfollow(request.viewer, body)))
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = FollowQuerySchema.parse(request.query)
    return reply.send(followStatesSchema.parse(await this.service.list(request.viewer, query)))
  }
}
