import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { pageSeoSchema, seoPathQuerySchema } from '@blog/contracts'
import { NotFoundError } from '@blog/errors'
import type { CrawlService } from './seo.sitemap.ts'
import type { SeoService } from './seo.service.ts'

export class SeoController {
  constructor(
    private readonly service: SeoService,
    private readonly crawl: CrawlService,
  ) {}

  async page(request: FastifyRequest, reply: FastifyReply) {
    const query = seoPathQuerySchema.parse(request.query)
    const page = pageSeoSchema.parse(await this.service.page(query.path))
    return reply.header('Cache-Control', 'no-store').send(page)
  }

  async robots(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send(await this.crawl.robots())
  }

  async sitemap(request: FastifyRequest, reply: FastifyReply) {
    const query = z.strictObject({ part: z.string().max(100).optional() }).parse(request.query)
    const document = await this.crawl.sitemap(query.part)
    if (!document) throw new NotFoundError()
    return reply.send(document)
  }
}
