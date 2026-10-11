import type { FastifyPluginAsync } from 'fastify'
import { socialCoverPreviewResponseSchema, socialCoverPreviewSchema } from '@blog/contracts'
import { ForbiddenError } from '@blog/errors'
import type { ObjectStore } from '../media/index.ts'
import type { CoverRenderer } from './social-cover.types.ts'
import { coverAssets } from './social-cover.assets.ts'

export const socialCoverRoutes: FastifyPluginAsync<{ renderer: CoverRenderer; store: ObjectStore; public_url: string }> = async (app, options) => {
  app.post('/v1/media/social-cover-preview', async (request, reply) => {
    if (request.viewer.role !== 'superadmin' || request.viewer.is_restricted) throw new ForbiddenError()
    const { input, variant } = socialCoverPreviewSchema.parse(request.body)
    const assets = await coverAssets(input, options.store, options.public_url)
    const result = await options.renderer.render({ input, variant, ...assets })
    for (const warning of result.warnings) request.log_ctx.warn({ warning }, 'social cover preview: using fallback')
    return reply.header('Cache-Control', 'no-store').send(socialCoverPreviewResponseSchema.parse({ image_url: `data:image/jpeg;base64,${Buffer.from(result.bytes).toString('base64')}` }))
  })
}
