import type { FastifyPluginAsync } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createReactionController } from './reaction.controller.ts'
import { createReactionRepository } from './reaction.repository.ts'
import { createReactionService } from './reaction.service.ts'

export type ReactionRoutesOptions = { database: DbHandle }

/** `POST /v1/reactions` — одна реакция участника на статью или комментарий. */
export const reactionRoutes: FastifyPluginAsync<ReactionRoutesOptions> = async (app, options) => {
  const controller = createReactionController(createReactionService(createReactionRepository(options.database.db)))
  app.post('/v1/reactions', (request, reply) => controller.create(request, reply))
}
