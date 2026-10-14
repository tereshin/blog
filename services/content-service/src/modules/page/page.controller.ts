import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  createPageSchema,
  updatePageSchema,
  deletePageSchema,
  adminPagesQuerySchema,
} from '@blog/contracts'
import { parsePageInput, PageIdSchema, PageSlugSchema } from './page.schema.ts'
import type { PageService } from './page.service.ts'

export class PageController {
  constructor(private readonly service: PageService) {}

  async publicPage(request: FastifyRequest, reply: FastifyReply) {
    return reply
      .header('Cache-Control', 'no-store')
      .send(await this.service.publicPage(parsePageInput(PageSlugSchema, request.params).slug))
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    return reply
      .header('Cache-Control', 'no-store')
      .send(await this.service.list(request.viewer, parsePageInput(adminPagesQuerySchema, request.query)))
  }

  async get(request: FastifyRequest, reply: FastifyReply) {
    return reply
      .header('Cache-Control', 'no-store')
      .send(await this.service.get(request.viewer, parsePageInput(PageIdSchema, request.params).id))
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const result = await this.service.create(
      request.viewer,
      parsePageInput(createPageSchema, request.body),
      request.idempotency_key ?? '',
      request.id,
    )
    return reply.code(result.status).header('Cache-Control', 'no-store').send(result.page)
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const result = await this.service.update(
      request.viewer,
      parsePageInput(PageIdSchema, request.params).id,
      parsePageInput(updatePageSchema, request.body),
      request.idempotency_key ?? '',
      request.id,
    )
    return reply.code(result.status).header('Cache-Control', 'no-store').send(result.page)
  }

  async remove(request: FastifyRequest, reply: FastifyReply) {
    await this.service.remove(
      request.viewer,
      parsePageInput(PageIdSchema, request.params).id,
      parsePageInput(deletePageSchema, request.body).expected_version,
      request.idempotency_key ?? '',
      request.id,
    )
    return reply.code(204).send()
  }
}
