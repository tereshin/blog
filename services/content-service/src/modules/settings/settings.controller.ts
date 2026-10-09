import type { FastifyReply, FastifyRequest } from 'fastify'
import { adminSettingsSchema, publicSettingsSchema, updateSettingsSchema } from './settings.schema.ts'
import type { SettingsService } from './settings.service.ts'

export function createSettingsController(service: SettingsService) {
  return {
    async getPublic(_request: FastifyRequest, reply: FastifyReply) {
      return reply.send(publicSettingsSchema.parse(await service.getPublic()))
    },
    async getAdmin(request: FastifyRequest, reply: FastifyReply) {
      return reply.send(adminSettingsSchema.parse(await service.getAdmin(request.viewer)))
    },
    async update(request: FastifyRequest, reply: FastifyReply) {
      const body = updateSettingsSchema.parse(request.body)
      return reply.send(adminSettingsSchema.parse(await service.update(request.viewer, body, request.correlation_id)))
    },
  }
}
