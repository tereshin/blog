import type { FastifyPluginAsync } from 'fastify'
import type { ReactionController } from './reaction.controller.ts'

export type ReactionRoutesOptions = { controller: ReactionController }

/** `POST /v1/reactions` — одна реакция участника на статью или комментарий. */
export const reactionRoutes: FastifyPluginAsync<ReactionRoutesOptions> = async (app, { controller }) => {
  app.post('/v1/reactions', (request, reply) => controller.create(request, reply))
}
