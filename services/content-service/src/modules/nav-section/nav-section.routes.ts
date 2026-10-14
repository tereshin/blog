import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import type { NavSectionController } from './nav-section.controller.ts'
import { requireNavAdmin } from './nav-section.service.ts'

export type NavSectionRoutesOptions = { controller: NavSectionController }

/** Чтение секций сайдбара доступно всем. Изменения — только суперадминистратор. */
export const navSectionRoutes: FastifyPluginAsync<NavSectionRoutesOptions> = async (app, { controller }) => {
  const admin = async (request: FastifyRequest) => {
    requireNavAdmin(request.viewer)
  }
  app.get('/v1/nav-sections', (request, reply) => controller.listPublic(request, reply))
  app.get('/v1/admin/nav-sections', { preValidation: admin }, (request, reply) => controller.listAdmin(request, reply))
  app.post('/v1/admin/nav-sections', { preValidation: admin }, (request, reply) => controller.createSection(request, reply))
  app.patch('/v1/admin/nav-sections/order', { preValidation: admin }, (request, reply) => controller.reorderSections(request, reply))
  app.patch('/v1/admin/nav-sections/:id/items/order', { preValidation: admin }, (request, reply) => controller.reorderItems(request, reply))
  app.post('/v1/admin/nav-sections/:id/items', { preValidation: admin }, (request, reply) => controller.createItem(request, reply))
  app.patch('/v1/admin/nav-sections/:id/items/:item_id', { preValidation: admin }, (request, reply) => controller.updateItem(request, reply))
  app.delete('/v1/admin/nav-sections/:id/items/:item_id', { preValidation: admin }, (request, reply) => controller.deleteItem(request, reply))
  app.patch('/v1/admin/nav-sections/:id', { preValidation: admin }, (request, reply) => controller.updateSection(request, reply))
  app.delete('/v1/admin/nav-sections/:id', { preValidation: admin }, (request, reply) => controller.deleteSection(request, reply))
}
