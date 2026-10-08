import Fastify from 'fastify'
import type { FastifyBaseLogger, FastifyInstance } from 'fastify'
import { errorHandler, health, requestContext, serviceContext } from '@blog/http-kit'
import type { Logger } from '@blog/logger'
import type { ServiceMetrics } from '@blog/telemetry'
import type { Env } from './config/env.ts'
import type { DbHandle } from './infra/db/client.ts'
import { mediaRoutes } from './modules/media/index.ts'
import type { ObjectStore } from './modules/media/index.ts'

export type AppDeps = {
  env: Env
  logger: Logger
  metrics: ServiceMetrics
  database: DbHandle
  store: ObjectStore
}

const BODY_LIMIT = 20 * 1024 * 1024

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const { env, logger } = deps
  const app: FastifyInstance = Fastify({ loggerInstance: logger as FastifyBaseLogger, trustProxy: true, bodyLimit: BODY_LIMIT })

  await app.register(requestContext, { logger })
  await app.register(errorHandler)
  await app.register(health, { metrics: deps.metrics, checks: [{ name: 'database', check: deps.database.isReady }] })
  await app.register(serviceContext, { public_key_pem: env.SERVICE_JWT_PUBLIC_KEY })
  await app.register(mediaRoutes, { database: deps.database, store: deps.store, public_url: env.S3_PUBLIC_URL })

  return app
}
