import type { FastifyReply, FastifyRequest } from 'fastify'
import { recordViewSchema, viewCountSchema } from '@blog/contracts'
import type { PublicApi } from '../../shared/public-api.ts'
import { ViewParamsSchema } from './view.schema.ts'
import type { ViewService } from './view.service.ts'

export class ViewController {
  constructor(private readonly service: PublicApi<ViewService<unknown>>) {}

  async record(request: FastifyRequest, reply: FastifyReply) {
    const params = ViewParamsSchema.parse(request.params)
    const body = recordViewSchema.parse(request.body ?? {})
    const response = await this.service.record({
      viewer: request.viewer,
      article_id: params.article_id,
      context: body.context,
      correlation_id: request.correlation_id,
    })
    return reply.send(viewCountSchema.parse(response))
  }
}
