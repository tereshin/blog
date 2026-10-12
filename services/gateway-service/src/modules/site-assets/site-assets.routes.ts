import { createHash } from 'node:crypto'
import type { FastifyPluginAsync } from 'fastify'
import { NotFoundError } from '@blog/errors'
import { faviconSettingsSchema, SERVICE_CONTEXT_HEADER, SITE_ASSETS } from '@blog/contracts'
import { ServiceUnavailableError } from '@blog/http-kit'
import type { ServiceClient } from '@blog/http-kit'
import { z } from 'zod'
import type { ProxyService } from '../proxy/index.ts'

const settingsSchema = z.object({ favicon: faviconSettingsSchema.optional() })
export const siteAssetRoutes: FastifyPluginAsync<{
  content: ServiceClient
  proxy: ProxyService
}> = async (app, options) => {
  for (const asset of SITE_ASSETS)
    app.get(asset.path, async (request, reply) => {
      const response = await options.content.request({
        path: '/v1/settings',
        service_context: request.viewer_session.service_context_jwt,
        correlation_id: request.correlation_id,
      })
      if (response.status !== 200) throw new ServiceUnavailableError('content')
      const parsed = settingsSchema.safeParse(response.body)
      if (!parsed.success) throw new ServiceUnavailableError('content')
      const url = parsed.data.favicon?.[asset.variant]
      if (!url) throw new NotFoundError()
      const etag = `"${createHash('sha256').update(url).digest('hex')}"`
      reply
        .header('Cache-Control', 'no-cache')
        .header('ETag', etag)
        .header('X-Content-Type-Options', 'nosniff')
      if (request.headers['if-none-match'] === etag) return reply.code(304).send()
      const file = await options.proxy.forward({
        entry: { prefix: '/internal/files/content', service: 'media' },
        method: 'GET',
        url: `/internal/files/content?url=${encodeURIComponent(url)}`,
        headers: { [SERVICE_CONTEXT_HEADER]: request.viewer_session.service_context_jwt },
        body: undefined,
        content_length: undefined,
      })
      if (file.status !== 200) {
        await file.body.dump()
        if (file.status === 404) throw new NotFoundError()
        throw new ServiceUnavailableError('media')
      }
      const mime = file.headers['content-type']
      return reply
        .type(typeof mime === 'string' ? mime : 'application/octet-stream')
        .send(file.body)
    })
}
