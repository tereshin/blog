import type { FastifyPluginAsync } from 'fastify'
import { updateSidebarSchema } from '@blog/contracts'
import { parsePageInput } from '../page/index.ts'
import type { WidgetService } from './widget.service.ts'
export const widgetRoutes: FastifyPluginAsync<{ service: WidgetService }> = async (
  app,
  { service },
) => {
  app.get('/v1/sidebar', async (_request, reply) =>
    reply.header('Cache-Control', 'no-store').send(await service.public()),
  )
  app.get('/v1/admin/sidebar', async (request, reply) =>
    reply.header('Cache-Control', 'no-store').send(await service.admin(request.viewer)),
  )
  app.put('/v1/admin/sidebar', async (request, reply) => {
    const input = parsePageInput(updateSidebarSchema, request.body)
    return reply.send(
      await service.save(
        request.viewer,
        input.sections,
        input.expected_version,
        request.idempotency_key ?? '',
      ),
    )
  })
}
