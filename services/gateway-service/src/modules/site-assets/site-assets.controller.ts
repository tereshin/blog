import type { FastifyReply, FastifyRequest } from 'fastify'
import type { FaviconVariant } from '@blog/contracts'
import type { SiteAssetsService } from './site-assets.service.ts'

export class SiteAssetsController {
  constructor(private readonly service: SiteAssetsService) {}

  async serve(request: FastifyRequest, reply: FastifyReply, variant: FaviconVariant) {
    const { service_context_jwt } = request.viewer_session
    const { url, etag } = await this.service.locate(variant, service_context_jwt, request.correlation_id)
    reply
      .header('Cache-Control', 'no-cache')
      .header('ETag', etag)
      .header('X-Content-Type-Options', 'nosniff')
    if (request.headers['if-none-match'] === etag) return reply.code(304).send()
    const file = await this.service.open(url, service_context_jwt)
    return reply.type(file.mime).send(file.body)
  }
}
