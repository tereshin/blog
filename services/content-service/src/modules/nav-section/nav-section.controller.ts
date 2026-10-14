import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  createNavSectionItemSchema,
  createNavSectionSchema,
  navSectionItemOrderSchema,
  navSectionOrderSchema,
  updateNavSectionItemSchema,
  updateNavSectionSchema,
} from '@blog/contracts'
import { NavSectionItemParamsSchema, NavSectionParamsSchema, parseNavInput } from './nav-section.schema.ts'
import type { NavSectionService } from './nav-section.service.ts'

export class NavSectionController {
  constructor(private readonly service: NavSectionService) {}

  async listPublic(_request: FastifyRequest, reply: FastifyReply) {
    return reply.header('Cache-Control', 'no-store').send(await this.service.listPublic())
  }

  async listAdmin(request: FastifyRequest, reply: FastifyReply) {
    return reply.header('Cache-Control', 'no-store').send(await this.service.listAdmin(request.viewer))
  }

  async createSection(request: FastifyRequest, reply: FastifyReply) {
    const result = await this.service.createSection(
      request.viewer,
      parseNavInput(createNavSectionSchema, request.body),
      request.idempotency_key ?? '',
    )
    return reply.code(result.status).header('Cache-Control', 'no-store').send(result.body)
  }

  async updateSection(request: FastifyRequest, reply: FastifyReply) {
    const { id } = parseNavInput(NavSectionParamsSchema, request.params)
    const result = await this.service.updateSection(
      request.viewer,
      id,
      parseNavInput(updateNavSectionSchema, request.body),
      request.idempotency_key ?? '',
    )
    return reply.code(result.status).header('Cache-Control', 'no-store').send(result.body)
  }

  async deleteSection(request: FastifyRequest, reply: FastifyReply) {
    const { id } = parseNavInput(NavSectionParamsSchema, request.params)
    await this.service.deleteSection(request.viewer, id, request.idempotency_key ?? '')
    return reply.code(204).header('Cache-Control', 'no-store').send()
  }

  async reorderSections(request: FastifyRequest, reply: FastifyReply) {
    const body = parseNavInput(navSectionOrderSchema, request.body)
    const result = await this.service.reorderSections(request.viewer, body.section_ids, request.idempotency_key ?? '')
    return reply.code(result.status).header('Cache-Control', 'no-store').send(result.body)
  }

  async createItem(request: FastifyRequest, reply: FastifyReply) {
    const { id } = parseNavInput(NavSectionParamsSchema, request.params)
    const result = await this.service.createItem(
      request.viewer,
      id,
      parseNavInput(createNavSectionItemSchema, request.body),
      request.idempotency_key ?? '',
    )
    return reply.code(result.status).header('Cache-Control', 'no-store').send(result.body)
  }

  async updateItem(request: FastifyRequest, reply: FastifyReply) {
    const { id, item_id } = parseNavInput(NavSectionItemParamsSchema, request.params)
    const result = await this.service.updateItem(
      request.viewer,
      id,
      item_id,
      parseNavInput(updateNavSectionItemSchema, request.body),
      request.idempotency_key ?? '',
    )
    return reply.code(result.status).header('Cache-Control', 'no-store').send(result.body)
  }

  async deleteItem(request: FastifyRequest, reply: FastifyReply) {
    const { id, item_id } = parseNavInput(NavSectionItemParamsSchema, request.params)
    await this.service.deleteItem(request.viewer, id, item_id, request.idempotency_key ?? '')
    return reply.code(204).header('Cache-Control', 'no-store').send()
  }

  async reorderItems(request: FastifyRequest, reply: FastifyReply) {
    const { id } = parseNavInput(NavSectionParamsSchema, request.params)
    const body = parseNavInput(navSectionItemOrderSchema, request.body)
    const result = await this.service.reorderItems(request.viewer, id, body.item_ids, request.idempotency_key ?? '')
    return reply.code(result.status).header('Cache-Control', 'no-store').send(result.body)
  }
}
