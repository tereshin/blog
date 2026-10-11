import type { FastifyPluginAsync } from 'fastify'
import { NotFoundError } from '@blog/errors'
import type { ServiceClient } from '@blog/http-kit'
import { isBot } from './bot-detector.ts'
import { renderPrerenderHtml } from './html-template.ts'
import { createPrerenderService } from './prerender.service.ts'

export type PrerenderRoutesOptions = { content: ServiceClient }
export const prerenderRoutes: FastifyPluginAsync<PrerenderRoutesOptions> = async (app, options) => {
  const service = createPrerenderService(options.content)
  app.get('/robots.txt', async (_request, reply) => {
    const document = await service.document('robots')
    return reply.header('Cache-Control', 'no-cache').type(`${document.content_type}; charset=utf-8`).send(document.body)
  })
  app.get('/sitemap.xml', async (_request, reply) => {
    const document = await service.document('sitemap')
    return reply.header('Cache-Control', 'no-cache').type(`${document.content_type}; charset=utf-8`).send(document.body)
  })
  app.get('/sitemaps/:part.xml', async (request, reply) => {
    const { part } = request.params as { part: string }
    const document = await service.document('sitemap', part)
    return reply.header('Cache-Control', 'no-cache').type(`${document.content_type}; charset=utf-8`).send(document.body)
  })
  app.get('/*', async (request, reply) => {
    if (!isBot(request.headers['user-agent'])) throw new NotFoundError()
    const page = await service.load(request.url)
    if (page.robots.startsWith('noindex')) reply.header('X-Robots-Tag', page.robots)
    return reply.code(page.status).header('Cache-Control', 'no-store').header('Vary', 'User-Agent').type('text/html; charset=utf-8').send(renderPrerenderHtml(page, reply.csp_nonce))
  })
}
