import type { FastifyPluginAsync } from 'fastify'
import type { FollowController } from './follow.controller.ts'

export type FollowRoutesOptions = { controller: FollowController }

/** Подписка на автора или тему. Повторная подписка не создаёт вторую строку. */
export const followRoutes: FastifyPluginAsync<FollowRoutesOptions> = async (app, { controller }) => {
  app.put('/v1/follows', (request, reply) => controller.follow(request, reply))
  app.delete('/v1/follows', (request, reply) => controller.unfollow(request, reply))
  app.get('/v1/me/follows', (request, reply) => controller.list(request, reply))
}
