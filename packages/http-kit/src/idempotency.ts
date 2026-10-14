import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { ValidationError } from '@blog/errors'
import { IDEMPOTENCY_KEY_HEADER } from './request-context.ts'

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const KEY_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/

export type IdempotencyOptions = {
  /** Если true, мутации без заголовка отклоняются. По умолчанию ключ необязателен. */
  required?: boolean
}

function headerValue(value: string | string[] | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value
  return candidate && candidate.length > 0 ? candidate : undefined
}

/**
 * Читает `X-Idempotency-Key` на мутациях, кладёт значение в `request.idempotency_key`.
 * Повтор и сохранённый ответ остаются в сервисе: у каждого своя таблица.
 */
const idempotencyPlugin: FastifyPluginAsync<IdempotencyOptions> = async (app, options) => {
  app.decorateRequest('idempotency_key', null)

  app.addHook('onRequest', async (request) => {
    if (!MUTATING.has(request.method)) {
      request.idempotency_key = null
      return
    }
    const raw = headerValue(request.headers[IDEMPOTENCY_KEY_HEADER])
    if (!raw) {
      request.idempotency_key = null
      if (options.required) {
        throw new ValidationError({
          message: 'Нужен заголовок X-Idempotency-Key',
          details: { field: 'idempotency_key' },
        })
      }
      return
    }
    if (!KEY_PATTERN.test(raw)) {
      throw new ValidationError({
        message: 'X-Idempotency-Key: 1–128 символов A–Z a–z 0–9 . _ : -',
        details: { field: 'idempotency_key' },
      })
    }
    request.idempotency_key = raw
  })
}

export const idempotency = fp(idempotencyPlugin, { name: 'blog-idempotency' })
