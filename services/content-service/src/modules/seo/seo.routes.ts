import type { FastifyPluginAsync } from 'fastify'
import type { SeoController } from './seo.controller.ts'

export type SeoRoutesOptions = { controller: SeoController }

export const seoRoutes: FastifyPluginAsync<SeoRoutesOptions> = async (app, { controller }) => {
  for (const path of ['/v1/seo', '/internal/seo/page']) {
    app.get(path, { config: { is_public: true } }, (request, reply) => controller.page(request, reply))
  }
  app.get('/internal/seo/robots', { config: { is_public: true } }, (request, reply) =>
    controller.robots(request, reply),
  )
  app.get('/internal/seo/sitemap', { config: { is_public: true } }, (request, reply) =>
    controller.sitemap(request, reply),
  )
}
