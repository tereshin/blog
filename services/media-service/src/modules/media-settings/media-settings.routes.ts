import type { FastifyPluginAsync } from 'fastify'
import { mediaSettingsSchema, storageTestResultSchema } from '@blog/contracts'
import type { MediaSettingsService } from './media-settings.service.ts'

export const mediaSettingsRoutes: FastifyPluginAsync<{ service: MediaSettingsService }> = async (
  app,
  { service },
) => {
  app.addHook('onRequest', async (request) => {
    if (request.routeOptions.url !== '/internal/media-settings/origins')
      service.assertAdmin(request.viewer)
  })
  app.addHook('onSend', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store')
  })
  app.get('/v1/media-settings', async (request) =>
    mediaSettingsSchema.parse(await service.get(request.viewer)),
  )
  app.put('/v1/media-settings', async (request) =>
    mediaSettingsSchema.parse(await service.update(request.viewer, request.body)),
  )
  app.post('/v1/media-settings/test', async (request) =>
    storageTestResultSchema.parse(await service.test(request.viewer, request.body)),
  )
  // Signed service context is still required; no credentials are exposed here.
  app.get('/internal/media-settings/origins', async () => ({
    origins: await service.publicOrigins(),
  }))
}
