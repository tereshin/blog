import type { FastifyReply, FastifyRequest } from 'fastify'
import { socialCoverPreviewResponseSchema } from '@blog/contracts'
import { SocialCoverPreviewBodySchema } from './social-cover.schema.ts'
import type { SocialCoverService } from './social-cover.service.ts'

export class SocialCoverController {
  constructor(private readonly service: SocialCoverService) {}

  async preview(request: FastifyRequest, reply: FastifyReply) {
    this.service.assertCanPreview(request.viewer)
    const body = SocialCoverPreviewBodySchema.parse(request.body)
    const result = await this.service.preview(request.viewer, body)
    for (const warning of result.warnings) request.log_ctx.warn({ warning }, 'social cover preview: using fallback')
    const image_url = `data:image/jpeg;base64,${Buffer.from(result.bytes).toString('base64')}`
    return reply.header('Cache-Control', 'no-store').send(socialCoverPreviewResponseSchema.parse({ image_url }))
  }
}
