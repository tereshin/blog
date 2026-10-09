import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import type { DbHandle } from '../../infra/db/client.ts'
import { createPrerenderRepository } from './prerender.repository.ts'
import { createPrerenderService } from './prerender.service.ts'

const paramsSchema = z.strictObject({
  kind: z.enum(['article', 'topic', 'profile', 'site']),
  slug: z.string().min(1),
})

const pageSchema = z.strictObject({
  title: z.string(),
  description: z.string(),
  image_url: z.string().nullable(),
  type: z.enum(['article', 'topic', 'profile', 'website']),
  text: z.string(),
})

export type PrerenderRoutesOptions = { database: DbHandle }

/**
 * То, что гость имеет право увидеть. Маршрут служебный и не требует зрителя:
 * правило видимости гостя применено внутри, личных полей в ответе нет.
 */
export const prerenderRoutes: FastifyPluginAsync<PrerenderRoutesOptions> = async (app, options) => {
  const service = createPrerenderService(createPrerenderRepository(options.database.db))
  app.get('/internal/prerender/:kind/:slug', { config: { is_public: true } }, async (request, reply) => {
    const params = paramsSchema.parse(request.params)
    return reply.send(pageSchema.parse(await service.page(params.kind, params.slug)))
  })
}
