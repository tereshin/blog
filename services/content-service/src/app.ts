import Fastify from 'fastify'
import type { FastifyBaseLogger, FastifyInstance } from 'fastify'
import { createServiceClient, errorHandler, health, requestContext, serviceContext } from '@blog/http-kit'
import type { Logger } from '@blog/logger'
import type { ServiceMetrics } from '@blog/telemetry'
import type { Env } from './config/env.ts'
import type { DbHandle } from './infra/db/client.ts'
import { lookupMediaFile } from './infra/http/media-files.ts'
import { accessRoutes } from './modules/access/index.ts'
import { articleRoutes, prerenderRoutes } from './modules/article/index.ts'
import { feedRoutes } from './modules/feed/index.ts'
import { followRoutes } from './modules/follow/index.ts'
import { moderationRoutes } from './modules/moderation/index.ts'
import { profileRoutes } from './modules/profile/index.ts'
import { promotionRoutes } from './modules/promotion/index.ts'
import { reportRoutes } from './modules/report/index.ts'
import { searchRoutes } from './modules/search/index.ts'
import { settingsRoutes } from './modules/settings/index.ts'
import { topicRoutes } from './modules/topic/index.ts'

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

  const media = createServiceClient({ name: 'media', base_url: env.MEDIA_URL })
  app.addHook('onClose', async () => {
    await media.close()
  })

  await app.register(accessRoutes, { database: deps.database })
  await app.register(topicRoutes, { database: deps.database, media_url: env.MEDIA_URL })
  await app.register(settingsRoutes, { database: deps.database, media_url: env.S3_PUBLIC_URL ?? env.MEDIA_URL })
  await app.register(feedRoutes, { database: deps.database })
  await app.register(searchRoutes, { database: deps.database })
  await app.register(prerenderRoutes, { database: deps.database })
  await app.register(articleRoutes, {
    database: deps.database,
    media_urls: [env.MEDIA_URL],
    lookupFile: (url) => lookupMediaFile(media, url),
  })
  await app.register(profileRoutes, { database: deps.database, media_url: env.MEDIA_URL, public_origin: env.PUBLIC_ORIGIN, media_public_url: env.S3_PUBLIC_URL })
  await app.register(followRoutes, { database: deps.database })
  await app.register(promotionRoutes, { database: deps.database })
  await app.register(reportRoutes, { database: deps.database })
  await app.register(moderationRoutes, { database: deps.database })

  return app
}
