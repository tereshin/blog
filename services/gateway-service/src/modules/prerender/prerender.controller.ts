import type { FastifyReply, FastifyRequest } from 'fastify'
import { SitemapPartParamsSchema } from './prerender.schema.ts'
import type { SeoDocument } from './prerender.schema.ts'
import type { PrerenderService } from './prerender.service.ts'

function sendDocument(reply: FastifyReply, document: SeoDocument) {
  return reply.header('Cache-Control', 'no-cache').type(`${document.content_type}; charset=utf-8`).send(document.body)
}

export class PrerenderController {
  constructor(private readonly service: PrerenderService) {}

  async robots(_request: FastifyRequest, reply: FastifyReply) {
    return sendDocument(reply, await this.service.document('robots'))
  }

  async sitemap(_request: FastifyRequest, reply: FastifyReply) {
    return sendDocument(reply, await this.service.document('sitemap'))
  }

  async sitemapPart(request: FastifyRequest, reply: FastifyReply) {
    const { part } = SitemapPartParamsSchema.parse(request.params)
    return sendDocument(reply, await this.service.document('sitemap', part))
  }

  async page(request: FastifyRequest, reply: FastifyReply) {
    const page = await this.service.renderPage(request.headers['user-agent'], request.url, reply.csp_nonce)
    if (page.robots_tag) reply.header('X-Robots-Tag', page.robots_tag)
    return reply.code(page.status).header('Cache-Control', 'no-store').header('Vary', 'User-Agent').type('text/html; charset=utf-8').send(page.html)
  }
}
