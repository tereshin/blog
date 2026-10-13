import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createPageRepository } from './page.repository.ts'
import { createPageService, requirePageAdmin } from './page.service.ts'
import type { PageOptions } from './page.service.ts'
import { createPageController } from './page.controller.ts'
import { pageResponseSchemas } from './page.schema.ts'
export const pageRoutes: FastifyPluginAsync<PageOptions & { database: DbHandle }> = async (
  app,
  options,
) => {
  const controller = createPageController(
    createPageService(createPageRepository(options.database.db), options),
  )
  const admin = async (request: FastifyRequest) => {
    requirePageAdmin(request.viewer)
  }
  const admin_response = { 200: pageResponseSchemas.admin }
  app.get(
    '/v1/pages/:slug',
    { schema: { response: { 200: pageResponseSchemas.public } } },
    controller.publicPage,
  )
  app.get(
    '/v1/admin/pages',
    { preValidation: admin, schema: { response: { 200: pageResponseSchemas.list } } },
    controller.list,
  )
  app.get(
    '/v1/admin/pages/:id',
    { preValidation: admin, schema: { response: admin_response } },
    controller.get,
  )
  app.post(
    '/v1/admin/pages',
    {
      preValidation: admin,
      bodyLimit: 1024 * 1024,
      schema: { response: { 201: pageResponseSchemas.admin } },
    },
    controller.create,
  )
  app.patch(
    '/v1/admin/pages/:id',
    { preValidation: admin, bodyLimit: 1024 * 1024, schema: { response: admin_response } },
    controller.update,
  )
  app.delete('/v1/admin/pages/:id', { preValidation: admin }, controller.remove)
}
