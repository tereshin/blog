import type { FastifyPluginAsync } from 'fastify'
import type { UserController } from './user.controller.ts'

export type UserRoutesOptions = { controller: UserController }

/** Управление участниками: только суперадминистратор. Ограничение отзывает все сессии. */
export const userRoutes: FastifyPluginAsync<UserRoutesOptions> = async (app, { controller }) => {
  app.patch('/v1/users/me/appearance', (request, reply) => controller.setAppearance(request, reply))
  app.delete('/v1/users/:id', (request, reply) => controller.remove(request, reply))
  app.put('/v1/users/:id/email-verification', (request, reply) =>
    controller.confirmEmail(request, reply),
  )
  app.get('/v1/users', (request, reply) => controller.list(request, reply))
  app.patch('/v1/users/:id/role', (request, reply) => controller.setRole(request, reply))
  app.patch('/v1/users/:id/publishing', (request, reply) =>
    controller.setPublishing(request, reply),
  )
  app.put('/v1/users/:id/restriction', (request, reply) => controller.restrict(request, reply))
  app.post('/v1/users/:id/restrict', (request, reply) => controller.restrict(request, reply))
  app.delete('/v1/users/:id/restriction', (request, reply) => controller.unrestrict(request, reply))
  app.delete('/v1/users/:id/restrict', (request, reply) => controller.unrestrict(request, reply))
}
