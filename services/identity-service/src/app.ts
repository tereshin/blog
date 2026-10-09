import Fastify from 'fastify'
import type { FastifyBaseLogger, FastifyInstance } from 'fastify'
import { errorHandler, health, requestContext, serviceContext } from '@blog/http-kit'
import type { Logger } from '@blog/logger'
import type { ServiceMetrics } from '@blog/telemetry'
import type { Env } from './config/env.ts'
import type { DbHandle } from './infra/db/client.ts'
import { authRoutes } from './modules/auth/index.ts'
import { sessionRoutes } from './modules/session/index.ts'
import { userRoutes } from './modules/user/index.ts'

export type AppDeps = {
  env: Env
  logger: Logger
  metrics: ServiceMetrics
  database: DbHandle
  is_broker_ready: () => boolean
}

/** Сборка Fastify: плагины, хуки, регистрация модулей. Бизнес-логики здесь нет. */
export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const { env, logger } = deps
  const app: FastifyInstance = Fastify({ loggerInstance: logger as FastifyBaseLogger, trustProxy: true })

  await app.register(requestContext, { logger })
  await app.register(errorHandler)
  await app.register(health, {
    metrics: deps.metrics,
    checks: [
      { name: 'database', check: deps.database.isReady },
      { name: 'broker', check: async () => deps.is_broker_ready() },
    ],
  })
  // Служебный контекст проверяется на каждом маршруте без `config: { is_public: true }`.
  await app.register(serviceContext, { public_key_pem: env.SERVICE_JWT_PUBLIC_KEY })
  await app.register(sessionRoutes, { database: deps.database })
  await app.register(authRoutes, { database: deps.database, env })
  await app.register(userRoutes, { database: deps.database })

  return app
}
