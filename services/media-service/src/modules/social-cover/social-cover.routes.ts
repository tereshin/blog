import type { FastifyPluginAsync } from 'fastify'
import type { SocialCoverController } from './social-cover.controller.ts'

export type SocialCoverRoutesOptions = { controller: SocialCoverController }

export const socialCoverRoutes: FastifyPluginAsync<SocialCoverRoutesOptions> = async (app, { controller }) => {
  app.post('/v1/media/social-cover-previews', (request, reply) => controller.preview(request, reply))
  app.post('/v1/media/social-cover-preview', (request, reply) => controller.preview(request, reply))
}
