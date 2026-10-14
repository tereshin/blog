import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { requirePageAdmin } from './page.service.ts'
import type { PageController } from './page.controller.ts'
import { pageResponseSchemas } from './page.schema.ts'

export type PageRoutesOptions = { controller: PageController }

export const pageRoutes: FastifyPluginAsync<PageRoutesOptions> = async (app, { controller }) => {
  const admin = async (request: FastifyRequest) => {
    requirePageAdmin(request.viewer)
  }
  const admin_response = { 200: pageResponseSchemas.admin }
  app.get(
    '/v1/pages/:slug',
    { schema: { response: { 200: pageResponseSchemas.public } } },
    (request, reply) => controller.publicPage(request, reply),
  )
  app.get(
    '/v1/admin/pages',
    { preValidation: admin, schema: { response: { 200: pageResponseSchemas.list } } },
    (request, reply) => controller.list(request, reply),
  )
  app.get(
    '/v1/admin/pages/:id',
    { preValidation: admin, schema: { response: admin_response } },
    (request, reply) => controller.get(request, reply),
  )
  app.post(
    '/v1/admin/pages',
    {
      preValidation: admin,
      bodyLimit: 1024 * 1024,
      schema: { response: { 201: pageResponseSchemas.admin } },
    },
    (request, reply) => controller.create(request, reply),
  )
  app.patch(
    '/v1/admin/pages/:id',
    { preValidation: admin, bodyLimit: 1024 * 1024, schema: { response: admin_response } },
    (request, reply) => controller.update(request, reply),
  )
  app.delete('/v1/admin/pages/:id', { preValidation: admin }, (request, reply) =>
    controller.remove(request, reply),
  )
}
