import type { FastifyPluginAsync } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createPromotionController } from './promotion.controller.ts'
import { createPromotionRepository } from './promotion.repository.ts'
import { createPromotionService } from './promotion.service.ts'

export type PromotionRoutesOptions = { database: DbHandle }

/** Подтверждение показов: 7 суток в «Популярном», повтор отсчитывает срок заново. */
export const promotionRoutes: FastifyPluginAsync<PromotionRoutesOptions> = async (app, options) => {
  const controller = createPromotionController(createPromotionService(createPromotionRepository(options.database.db)))
  app.post('/v1/articles/:id/promotion', (request, reply) => controller.confirm(request, reply))
  app.get('/v1/articles/:id/promotion', (request, reply) => controller.get(request, reply))
}
