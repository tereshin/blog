import type { FastifyPluginAsync } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createFollowController } from './follow.controller.ts'
import { createFollowRepository } from './follow.repository.ts'
import { createFollowService } from './follow.service.ts'

export type FollowRoutesOptions = { database: DbHandle }

/** Подписка на автора или тему. Повторная подписка не создаёт вторую строку. */
export const followRoutes: FastifyPluginAsync<FollowRoutesOptions> = async (app, options) => {
  const controller = createFollowController(createFollowService(createFollowRepository(options.database.db)))
  app.put('/v1/follows', (request, reply) => controller.follow(request, reply))
  app.delete('/v1/follows', (request, reply) => controller.unfollow(request, reply))
  app.get('/v1/me/follows', (request, reply) => controller.list(request, reply))
}
