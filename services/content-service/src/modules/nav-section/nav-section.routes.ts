import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createNavSectionController } from './nav-section.controller.ts'
import { createNavSectionRepository } from './nav-section.repository.ts'
import { createNavSectionService, requireNavAdmin } from './nav-section.service.ts'

/** Чтение секций сайдбара доступно всем. Изменения — только суперадминистратор. */
export const navSectionRoutes: FastifyPluginAsync<{ database: DbHandle }> = async (app, options) => {
  const controller = createNavSectionController(
    createNavSectionService(createNavSectionRepository(options.database.db)),
  )
  const admin = async (request: FastifyRequest) => {
    requireNavAdmin(request.viewer)
  }
  app.get('/v1/nav-sections', controller.listPublic)
  app.get('/v1/admin/nav-sections', { preValidation: admin }, controller.listAdmin)
  app.post('/v1/admin/nav-sections', { preValidation: admin }, controller.createSection)
  app.patch('/v1/admin/nav-sections/order', { preValidation: admin }, controller.reorderSections)
  app.patch('/v1/admin/nav-sections/:id/items/order', { preValidation: admin }, controller.reorderItems)
  app.post('/v1/admin/nav-sections/:id/items', { preValidation: admin }, controller.createItem)
  app.patch('/v1/admin/nav-sections/:id/items/:item_id', { preValidation: admin }, controller.updateItem)
  app.delete('/v1/admin/nav-sections/:id/items/:item_id', { preValidation: admin }, controller.deleteItem)
  app.patch('/v1/admin/nav-sections/:id', { preValidation: admin }, controller.updateSection)
  app.delete('/v1/admin/nav-sections/:id', { preValidation: admin }, controller.deleteSection)
}
