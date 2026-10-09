import type { FastifyReply, FastifyRequest } from 'fastify'
import { followStateSchema, followStatesSchema } from '@blog/contracts'
import { followBodySchema, followQuerySchema } from './follow.schema.ts'
import type { FollowService } from './follow.types.ts'

export function createFollowController(service: FollowService) {
  return {
    async follow(request: FastifyRequest, reply: FastifyReply) {
      const body = followBodySchema.parse(request.body)
      return reply.send(followStateSchema.parse(await service.follow(request.viewer, body)))
    },
    async unfollow(request: FastifyRequest, reply: FastifyReply) {
      const body = followBodySchema.parse(request.body)
      return reply.send(followStateSchema.parse(await service.unfollow(request.viewer, body)))
    },
    async list(request: FastifyRequest, reply: FastifyReply) {
      const query = followQuerySchema.parse(request.query)
      return reply.send(followStatesSchema.parse(await service.list(request.viewer, query)))
    },
  }
}
