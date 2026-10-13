import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  createPageSchema,
  updatePageSchema,
  deletePageSchema,
  adminPagesQuerySchema,
} from '@blog/contracts'
import { parsePageInput, pageIdSchema, pageSlugSchema } from './page.schema.ts'
import type { PageService } from './page.service.ts'
function key(request: FastifyRequest): string {
  const value = request.headers['x-idempotency-key']
  return typeof value === 'string' ? value : ''
}
export function createPageController(service: PageService) {
  return {
    async publicPage(request: FastifyRequest, reply: FastifyReply) {
      return reply
        .header('Cache-Control', 'no-store')
        .send(await service.publicPage(parsePageInput(pageSlugSchema, request.params).slug))
    },
    async list(request: FastifyRequest, reply: FastifyReply) {
      return reply
        .header('Cache-Control', 'no-store')
        .send(
          await service.list(request.viewer, parsePageInput(adminPagesQuerySchema, request.query)),
        )
    },
    async get(request: FastifyRequest, reply: FastifyReply) {
      return reply
        .header('Cache-Control', 'no-store')
        .send(await service.get(request.viewer, parsePageInput(pageIdSchema, request.params).id))
    },
    async create(request: FastifyRequest, reply: FastifyReply) {
      const result = await service.create(
        request.viewer,
        parsePageInput(createPageSchema, request.body),
        key(request),
        request.id,
      )
      return reply.code(result.status).header('Cache-Control', 'no-store').send(result.page)
    },
    async update(request: FastifyRequest, reply: FastifyReply) {
      const result = await service.update(
        request.viewer,
        parsePageInput(pageIdSchema, request.params).id,
        parsePageInput(updatePageSchema, request.body),
        key(request),
        request.id,
      )
      return reply.code(result.status).header('Cache-Control', 'no-store').send(result.page)
    },
    async remove(request: FastifyRequest, reply: FastifyReply) {
      await service.remove(
        request.viewer,
        parsePageInput(pageIdSchema, request.params).id,
        parsePageInput(deletePageSchema, request.body).expected_version,
        key(request),
        request.id,
      )
      return reply.code(204).send()
    },
  }
}
