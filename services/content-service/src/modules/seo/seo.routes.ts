import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { pageSeoSchema, seoPathQuerySchema } from '@blog/contracts'
import { NotFoundError } from '@blog/errors'
import type { DbHandle } from '../../infra/db/client.ts'
import { createSeoRepository } from './seo.repository.ts'
import { createSeoService } from './seo.service.ts'
import { createCrawlService } from './seo.sitemap.ts'
import type { SeoOptions } from './seo.types.ts'

export type SeoRoutesOptions = SeoOptions & { database: DbHandle }
export const seoRoutes: FastifyPluginAsync<SeoRoutesOptions> = async (app, options) => {
  const repository = createSeoRepository(options.database.db)
  const service = createSeoService(repository, options)
  const crawl = createCrawlService(options.database.db, repository, options)
  for (const path of ['/v1/seo', '/internal/seo/page']) {
    app.get(path, { config: { is_public: true } }, async (request, reply) => {
      const query = seoPathQuerySchema.parse(request.query)
      const page = pageSeoSchema.parse(await service.page(query.path))
      return reply.header('Cache-Control', 'no-store').send(page)
    })
  }
  app.get('/internal/seo/robots', { config: { is_public: true } }, async (_request, reply) => reply.send(await crawl.robots()))
  app.get('/internal/seo/sitemap', { config: { is_public: true } }, async (request, reply) => {
    const query = z.strictObject({ part: z.string().max(100).optional() }).parse(request.query)
    const document = await crawl.sitemap(query.part)
    if (!document) throw new NotFoundError()
    return reply.send(document)
  })
}
