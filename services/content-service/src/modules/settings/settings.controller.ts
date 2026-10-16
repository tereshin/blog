import { maintenanceStatusSchema } from '@blog/contracts'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { AdminSettingsSchema, PublicSettingsSchema, UpdateSettingsSchema } from './settings.schema.ts'
import type { SettingsService } from './settings.service.ts'

/** Транзакция сервиса контроллеру не нужна: берём только сценарии без `TTx`. */
type SettingsUseCases = Pick<
  SettingsService<never>,
  'getPublic' | 'getAdmin' | 'update' | 'getMaintenance'
>

export class SettingsController {
  constructor(private readonly service: SettingsUseCases) {}

  async getMaintenance(_request: FastifyRequest, reply: FastifyReply) {
    return reply
      .header('Cache-Control', 'no-store')
      .send(maintenanceStatusSchema.parse(await this.service.getMaintenance()))
  }

  async getPublic(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(PublicSettingsSchema.parse(await this.service.getPublic(request.viewer)))
  }

  async getAdmin(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(AdminSettingsSchema.parse(await this.service.getAdmin(request.viewer)))
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const body = UpdateSettingsSchema.parse(request.body)
    return reply.send(AdminSettingsSchema.parse(await this.service.update(request.viewer, body, request.correlation_id)))
  }
}
