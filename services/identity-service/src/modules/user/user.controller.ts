import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  adminUserPageSchema,
  adminUserSchema,
  restrictUserSchema,
  updateAppearanceSchema,
  updateUserPublishingSchema,
  updateUserRoleSchema,
} from '@blog/contracts'
import { UserListQuerySchema, UserParamsSchema } from './user.schema.ts'
import { z } from 'zod'
import type { UserEmailVerificationService } from './user-email.service.ts'
import type { UserService } from './user.service.ts'

export class UserController {
  constructor(
    private readonly service: UserService,
    private readonly email_verification: UserEmailVerificationService,
  ) {}

  async confirmEmail(request: FastifyRequest, reply: FastifyReply) {
    const { id } = UserParamsSchema.parse(request.params)
    z.strictObject({}).parse(request.body ?? {})
    await this.email_verification.confirm(request.viewer, id)
    return reply.code(204).send()
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = UserListQuerySchema.parse(request.query)
    return reply.send(adminUserPageSchema.parse(await this.service.list(request.viewer, query)))
  }

  async remove(request: FastifyRequest, reply: FastifyReply) {
    const { id } = UserParamsSchema.parse(request.params)
    await this.service.remove(request.viewer, id, request.correlation_id)
    return reply.code(204).send()
  }

  async setRole(request: FastifyRequest, reply: FastifyReply) {
    const params = UserParamsSchema.parse(request.params)
    const body = updateUserRoleSchema.parse(request.body)
    return reply.send(
      adminUserSchema.parse(
        await this.service.setRole(request.viewer, params.id, body, request.correlation_id),
      ),
    )
  }

  async setPublishing(request: FastifyRequest, reply: FastifyReply) {
    const params = UserParamsSchema.parse(request.params)
    const body = updateUserPublishingSchema.parse(request.body)
    return reply.send(
      adminUserSchema.parse(
        await this.service.setPublishing(request.viewer, params.id, body, request.correlation_id),
      ),
    )
  }

  async restrict(request: FastifyRequest, reply: FastifyReply) {
    const params = UserParamsSchema.parse(request.params)
    restrictUserSchema.parse(request.body ?? {})
    return reply.send(
      adminUserSchema.parse(
        await this.service.restrict(request.viewer, params.id, request.correlation_id),
      ),
    )
  }

  async unrestrict(request: FastifyRequest, reply: FastifyReply) {
    const params = UserParamsSchema.parse(request.params)
    return reply.send(
      adminUserSchema.parse(
        await this.service.unrestrict(request.viewer, params.id, request.correlation_id),
      ),
    )
  }

  async setAppearance(request: FastifyRequest, reply: FastifyReply) {
    const body = updateAppearanceSchema.parse(request.body)
    return reply.send(
      updateAppearanceSchema.parse(
        await this.service.setAppearance(request.viewer, body, request.correlation_id),
      ),
    )
  }
}
