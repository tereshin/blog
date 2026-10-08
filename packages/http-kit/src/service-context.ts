import { createPublicKey } from 'node:crypto'
import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { jwtVerify } from 'jose'
import type { CryptoKey, KeyObject } from 'jose'
import {
  SERVICE_CONTEXT_HEADER,
  claimsToContext,
  serviceJwtClaimsSchema,
} from '@blog/contracts'
import type { ServiceContext } from '@blog/contracts'
import { UnauthorizedError } from '@blog/errors'

export const SERVICE_JWT_ALG = 'EdDSA'

declare module 'fastify' {
  interface FastifyRequest {
    /** Проверенный служебный контекст зрителя. Заполняется на маршрутах без `is_public`. */
    viewer: ServiceContext
  }
  interface FastifyContextConfig {
    /** Маршрут без служебного контекста: health, metrics, `/internal/*` для gateway. */
    is_public?: boolean
  }
}

export type ServiceContextOptions = {
  /** PEM публичного ключа; `\n` в переменной окружения допускается как литерал. */
  public_key_pem: string
}

export function normalizePem(value: string): string {
  return value.includes('\\n') ? value.replaceAll('\\n', '\n') : value
}

function loadKey(pem: string): KeyObject | CryptoKey {
  return createPublicKey(normalizePem(pem))
}

/** Проверяет подпись JWT из `X-Service-Context` (EdDSA) и кладёт контекст в `request.viewer`. */
const serviceContextPlugin: FastifyPluginAsync<ServiceContextOptions> = async (app, options) => {
  const key = loadKey(options.public_key_pem)
  app.decorateRequest('viewer', undefined as unknown as ServiceContext) // заполняется в onRequest

  app.addHook('onRequest', async (request) => {
    if (request.routeOptions.config.is_public) return
    const token = request.headers[SERVICE_CONTEXT_HEADER]
    if (typeof token !== 'string' || token === '') {
      throw new UnauthorizedError({ message: 'Нет служебного контекста' })
    }
    try {
      const { payload } = await jwtVerify(token, key, { algorithms: [SERVICE_JWT_ALG] })
      request.viewer = claimsToContext(serviceJwtClaimsSchema.parse(payload))
    } catch (cause) {
      throw new UnauthorizedError({ message: 'Служебный контекст недействителен', cause })
    }
  })
}

export const serviceContext = fp(serviceContextPlugin, { name: 'blog-service-context' })
