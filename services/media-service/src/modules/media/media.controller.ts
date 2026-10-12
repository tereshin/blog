import type { Readable } from 'node:stream'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { mediaUploadResponseSchema } from '@blog/contracts'
import { IDEMPOTENCY_KEY_HEADER } from '@blog/http-kit'
import { fileLookupQuerySchema, uploadQuerySchema } from './media.schema.ts'
import type { MediaService } from './media.types.ts'

function header(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function createMediaController(service: MediaService) {
  return {
    async upload(request: FastifyRequest, reply: FastifyReply) {
      const query = uploadQuerySchema.parse(request.query)
      const length = header(request.headers['content-length'])
      const file = await service.upload({
        viewer: request.viewer,
        kind: query.kind,
        variant: query.variant,
        idempotency_key: header(request.headers[IDEMPOTENCY_KEY_HEADER]),
        body: request.body as Readable,
        content_length: length === undefined ? undefined : Number(length),
      })
      return reply.code(201).send(
        mediaUploadResponseSchema.parse({
          id: file.id,
          url: file.url,
          kind: file.kind,
          mime: file.mime,
          byte_size: file.byte_size,
        }),
      )
    },
    async content(request: FastifyRequest, reply: FastifyReply) {
      const { url } = fileLookupQuerySchema.parse(request.query)
      const file = await service.content(url)
      return reply.type(file.mime).header('X-Content-Type-Options', 'nosniff').send(file.body)
    },
    async lookup(request: FastifyRequest, reply: FastifyReply) {
      const query = fileLookupQuerySchema.parse(request.query)
      return reply.send(await service.lookup(query.url))
    },
  }
}
