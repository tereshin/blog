import type { FastifyReply, FastifyRequest } from 'fastify'
import { adminUserPageSchema, adminUserSchema, restrictUserSchema, updateAppearanceSchema, updateUserPublishingSchema, updateUserRoleSchema } from '@blog/contracts'
import { userListQuerySchema, userParamsSchema } from './user.schema.ts'
import type { UserService } from './user.types.ts'

export function createUserController(service: UserService) {
  return {
    async list(request: FastifyRequest, reply: FastifyReply) {
      const query = userListQuerySchema.parse(request.query)
      return reply.send(adminUserPageSchema.parse(await service.list(request.viewer, query)))
    },
    async setRole(request: FastifyRequest, reply: FastifyReply) {
      const params = userParamsSchema.parse(request.params)
      const body = updateUserRoleSchema.parse(request.body)
      return reply.send(adminUserSchema.parse(await service.setRole(request.viewer, params.id, body, request.correlation_id)))
    },
    async setPublishing(request: FastifyRequest, reply: FastifyReply) {
      const params = userParamsSchema.parse(request.params)
      const body = updateUserPublishingSchema.parse(request.body)
      return reply.send(adminUserSchema.parse(await service.setPublishing(request.viewer, params.id, body, request.correlation_id)))
    },
    async restrict(request: FastifyRequest, reply: FastifyReply) {
      const params = userParamsSchema.parse(request.params)
      restrictUserSchema.parse(request.body ?? {})
      return reply.send(adminUserSchema.parse(await service.restrict(request.viewer, params.id, request.correlation_id)))
    },
    async unrestrict(request: FastifyRequest, reply: FastifyReply) {
      const params = userParamsSchema.parse(request.params)
      return reply.send(adminUserSchema.parse(await service.unrestrict(request.viewer, params.id, request.correlation_id)))
    },
    async setAppearance(request: FastifyRequest, reply: FastifyReply) {
      const body = updateAppearanceSchema.parse(request.body)
      return reply.send(updateAppearanceSchema.parse(await service.setAppearance(request.viewer, body, request.correlation_id)))
    },
  }
}
