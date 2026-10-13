import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  createNavSectionItemSchema,
  createNavSectionSchema,
  navSectionItemOrderSchema,
  navSectionOrderSchema,
  updateNavSectionItemSchema,
  updateNavSectionSchema,
} from '@blog/contracts'
import { navSectionItemParamsSchema, navSectionParamsSchema, parseNavInput } from './nav-section.schema.ts'
import type { NavSectionService } from './nav-section.service.ts'

function key(request: FastifyRequest): string {
  const value = request.headers['x-idempotency-key']
  return typeof value === 'string' ? value : ''
}

export function createNavSectionController(service: NavSectionService) {
  return {
    async listPublic(_request: FastifyRequest, reply: FastifyReply) {
      return reply.header('Cache-Control', 'no-store').send(await service.listPublic())
    },
    async listAdmin(request: FastifyRequest, reply: FastifyReply) {
      return reply.header('Cache-Control', 'no-store').send(await service.listAdmin(request.viewer))
    },
    async createSection(request: FastifyRequest, reply: FastifyReply) {
      const result = await service.createSection(
        request.viewer,
        parseNavInput(createNavSectionSchema, request.body),
        key(request),
      )
      return reply.code(result.status).header('Cache-Control', 'no-store').send(result.body)
    },
    async updateSection(request: FastifyRequest, reply: FastifyReply) {
      const { id } = parseNavInput(navSectionParamsSchema, request.params)
      const result = await service.updateSection(
        request.viewer,
        id,
        parseNavInput(updateNavSectionSchema, request.body),
        key(request),
      )
      return reply.code(result.status).header('Cache-Control', 'no-store').send(result.body)
    },
    async deleteSection(request: FastifyRequest, reply: FastifyReply) {
      const { id } = parseNavInput(navSectionParamsSchema, request.params)
      await service.deleteSection(request.viewer, id, key(request))
      return reply.code(204).header('Cache-Control', 'no-store').send()
    },
    async reorderSections(request: FastifyRequest, reply: FastifyReply) {
      const body = parseNavInput(navSectionOrderSchema, request.body)
      const result = await service.reorderSections(request.viewer, body.section_ids, key(request))
      return reply.code(result.status).header('Cache-Control', 'no-store').send(result.body)
    },
    async createItem(request: FastifyRequest, reply: FastifyReply) {
      const { id } = parseNavInput(navSectionParamsSchema, request.params)
      const result = await service.createItem(
        request.viewer,
        id,
        parseNavInput(createNavSectionItemSchema, request.body),
        key(request),
      )
      return reply.code(result.status).header('Cache-Control', 'no-store').send(result.body)
    },
    async updateItem(request: FastifyRequest, reply: FastifyReply) {
      const { id, item_id } = parseNavInput(navSectionItemParamsSchema, request.params)
      const result = await service.updateItem(
        request.viewer,
        id,
        item_id,
        parseNavInput(updateNavSectionItemSchema, request.body),
        key(request),
      )
      return reply.code(result.status).header('Cache-Control', 'no-store').send(result.body)
    },
    async deleteItem(request: FastifyRequest, reply: FastifyReply) {
      const { id, item_id } = parseNavInput(navSectionItemParamsSchema, request.params)
      await service.deleteItem(request.viewer, id, item_id, key(request))
      return reply.code(204).header('Cache-Control', 'no-store').send()
    },
    async reorderItems(request: FastifyRequest, reply: FastifyReply) {
      const { id } = parseNavInput(navSectionParamsSchema, request.params)
      const body = parseNavInput(navSectionItemOrderSchema, request.body)
      const result = await service.reorderItems(request.viewer, id, body.item_ids, key(request))
      return reply.code(result.status).header('Cache-Control', 'no-store').send(result.body)
    },
  }
}
