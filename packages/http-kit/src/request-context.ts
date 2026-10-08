import { randomUUID } from 'node:crypto'
import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { createRequestLogger } from '@blog/logger'
import type { Logger } from '@blog/logger'

export const REQUEST_ID_HEADER = 'x-request-id'
export const CORRELATION_ID_HEADER = 'x-correlation-id'
export const IDEMPOTENCY_KEY_HEADER = 'x-idempotency-key'

declare module 'fastify' {
  interface FastifyRequest {
    request_id: string
    correlation_id: string
    log_ctx: Logger
  }
}

export type RequestContextOptions = { logger: Logger }

const SAFE_ID = /^[A-Za-z0-9._:-]{1,128}$/

function pickId(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value
  return candidate && SAFE_ID.test(candidate) ? candidate : randomUUID()
}

/** `X-Request-Id` и `correlation_id` — из заголовка или новые; отдаются в ответе и в логе. */
const requestContextPlugin: FastifyPluginAsync<RequestContextOptions> = async (app, options) => {
  app.decorateRequest('request_id', '')
  app.decorateRequest('correlation_id', '')
  app.decorateRequest('log_ctx', undefined as unknown as Logger) // Fastify требует значение по умолчанию; заполняется в onRequest

  app.addHook('onRequest', async (request, reply) => {
    request.request_id = pickId(request.headers[REQUEST_ID_HEADER])
    request.correlation_id = pickId(request.headers[CORRELATION_ID_HEADER] ?? request.request_id)
    request.log_ctx = createRequestLogger(options.logger, {
      request_id: request.request_id,
      correlation_id: request.correlation_id,
    })
    void reply.header('X-Request-Id', request.request_id)
  })
}

export const requestContext = fp(requestContextPlugin, { name: 'blog-request-context' })
