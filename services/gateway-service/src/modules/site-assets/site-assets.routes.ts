import type { FastifyPluginAsync } from 'fastify'
import { SITE_ASSETS } from '@blog/contracts'
import type { SiteAssetsController } from './site-assets.controller.ts'

export type SiteAssetsRoutesOptions = { controller: SiteAssetsController }

export const siteAssetsRoutes: FastifyPluginAsync<SiteAssetsRoutesOptions> = async (app, { controller }) => {
  for (const asset of SITE_ASSETS) app.get(asset.path, (request, reply) => controller.serve(request, reply, asset.variant))
}
