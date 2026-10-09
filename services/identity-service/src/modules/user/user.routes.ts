import type { FastifyPluginAsync } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createUserController } from './user.controller.ts'
import { createUserRepository } from './user.repository.ts'
import { createUserService } from './user.service.ts'

export type UserRoutesOptions = { database: DbHandle }

/** Управление участниками: только суперадминистратор. Ограничение отзывает все сессии. */
export const userRoutes: FastifyPluginAsync<UserRoutesOptions> = async (app, options) => {
  const controller = createUserController(createUserService(createUserRepository(options.database.db)))
  app.patch('/v1/users/me/appearance', (request, reply) => controller.setAppearance(request, reply))
  app.get('/v1/users', (request, reply) => controller.list(request, reply))
  app.patch('/v1/users/:id/role', (request, reply) => controller.setRole(request, reply))
  app.patch('/v1/users/:id/publishing', (request, reply) => controller.setPublishing(request, reply))
  app.post('/v1/users/:id/restrict', (request, reply) => controller.restrict(request, reply))
  app.delete('/v1/users/:id/restrict', (request, reply) => controller.unrestrict(request, reply))
}
