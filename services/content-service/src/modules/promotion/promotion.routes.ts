import type { FastifyPluginAsync } from 'fastify'
import type { PromotionController } from './promotion.controller.ts'

export type PromotionRoutesOptions = { controller: PromotionController }

/** Подтверждение показов: 7 суток в «Популярном», повтор отсчитывает срок заново. */
export const promotionRoutes: FastifyPluginAsync<PromotionRoutesOptions> = async (app, { controller }) => {
  app.post('/v1/articles/:id/promotion', (request, reply) => controller.confirm(request, reply))
  app.get('/v1/articles/:id/promotion', (request, reply) => controller.get(request, reply))
}
