import type { Readable } from 'node:stream'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { mediaUploadResponseSchema } from '@blog/contracts'
import { FileLookupQuerySchema, UploadQuerySchema } from './media.schema.ts'
import type { MediaService } from './media.service.ts'

function header(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export class MediaController {
  constructor(private readonly service: MediaService) {}

  async upload(request: FastifyRequest, reply: FastifyReply) {
    const query = UploadQuerySchema.parse(request.query)
    const length = header(request.headers['content-length'])
    const file = await this.service.upload({
      viewer: request.viewer,
      kind: query.kind,
      variant: query.variant,
      idempotency_key: request.idempotency_key ?? undefined,
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
  }

  async content(request: FastifyRequest, reply: FastifyReply) {
    const { url } = FileLookupQuerySchema.parse(request.query)
    const file = await this.service.content(url)
    return reply.type(file.mime).header('X-Content-Type-Options', 'nosniff').send(file.body)
  }

  async lookup(request: FastifyRequest, reply: FastifyReply) {
    const query = FileLookupQuerySchema.parse(request.query)
    return reply.send(await this.service.lookup(query.url))
  }
}
