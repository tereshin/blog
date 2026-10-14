import type { FastifyPluginAsync } from 'fastify'
import type { PrerenderController } from './prerender.controller.ts'

export type PrerenderRoutesOptions = { controller: PrerenderController }

export const prerenderRoutes: FastifyPluginAsync<PrerenderRoutesOptions> = async (app, { controller }) => {
  app.get('/robots.txt', (request, reply) => controller.robots(request, reply))
  app.get('/sitemap.xml', (request, reply) => controller.sitemap(request, reply))
  app.get('/sitemaps/:part.xml', (request, reply) => controller.sitemapPart(request, reply))
  app.get('/*', (request, reply) => controller.page(request, reply))
}
