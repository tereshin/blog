import Fastify from 'fastify'
import type { FastifyBaseLogger, FastifyInstance } from 'fastify'
import { createServiceClient, errorHandler, health, idempotency, requestContext, serviceContext } from '@blog/http-kit'
import type { Logger } from '@blog/logger'
import type { ServiceMetrics } from '@blog/telemetry'
import { composeContent } from './app.modules.ts'
import type { Env } from './config/env.ts'
import type { DbHandle } from './infra/db/client.ts'
import { lookupMediaFile } from './infra/http/media-files.ts'
import { accessRoutes } from './modules/access/index.ts'
import { articleRoutes } from './modules/article/index.ts'
import { feedRoutes } from './modules/feed/index.ts'
import { followRoutes } from './modules/follow/index.ts'
import { moderationRoutes } from './modules/moderation/index.ts'
import { navSectionRoutes } from './modules/nav-section/index.ts'
import { pageRoutes } from './modules/page/index.ts'
import { profileRoutes } from './modules/profile/index.ts'
import { promotionRoutes } from './modules/promotion/index.ts'
import { reportRoutes } from './modules/report/index.ts'
import { searchRoutes } from './modules/search/index.ts'
import { seoRoutes } from './modules/seo/index.ts'
import { settingsRoutes } from './modules/settings/index.ts'
import { topicRoutes } from './modules/topic/index.ts'

export type AppDeps = {
  env: Env
  logger: Logger
  metrics: ServiceMetrics
  database: DbHandle
  is_broker_ready: () => boolean
}

/** Явный потолок JSON-тела; файлы идут в media-service со своим лимитом. */
const BODY_LIMIT_BYTES = 1_048_576

/** Сборка Fastify: плагины, хуки, регистрация модулей. Бизнес-логики здесь нет. */
export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const { env, logger } = deps
  const app: FastifyInstance = Fastify({
    loggerInstance: logger as FastifyBaseLogger,
    trustProxy: true,
    bodyLimit: BODY_LIMIT_BYTES,
  })

  await app.register(requestContext, { logger })
  await app.register(idempotency)
  await app.register(errorHandler)
  await app.register(health, {
    metrics: deps.metrics,
    checks: [
      { name: 'database', check: deps.database.isReady },
      { name: 'broker', check: async () => deps.is_broker_ready() },
    ],
  })
  await app.register(serviceContext, { public_key_pem: env.SERVICE_JWT_PUBLIC_KEY })

  const media = createServiceClient({ name: 'media', base_url: env.MEDIA_URL })
  app.addHook('onClose', async () => {
    await media.close()
  })

  const modules = composeContent({
    database: deps.database,
    media_url: env.MEDIA_URL,
    media_public_url: env.S3_PUBLIC_URL,
    public_origin: env.PUBLIC_ORIGIN,
    app_env: env.APP_ENV,
    media_urls: [env.MEDIA_URL, ...(env.S3_PUBLIC_URL ? [env.S3_PUBLIC_URL] : [])],
    lookupFile: (url) => lookupMediaFile(media, url),
  })

  await app.register(accessRoutes, { controller: modules.access })
  await app.register(topicRoutes, { controller: modules.topic })
  await app.register(settingsRoutes, { controller: modules.settings })
  await app.register(feedRoutes, { controller: modules.feed })
  await app.register(searchRoutes, { controller: modules.search })
  await app.register(seoRoutes, { controller: modules.seo })
  await app.register(articleRoutes, { controller: modules.article })
  await app.register(navSectionRoutes, { controller: modules.nav })
  await app.register(pageRoutes, { controller: modules.page })
  await app.register(profileRoutes, { controller: modules.profile })
  await app.register(followRoutes, { controller: modules.follow })
  await app.register(promotionRoutes, { controller: modules.promotion })
  await app.register(reportRoutes, { controller: modules.report })
  await app.register(moderationRoutes, { controller: modules.moderation })

  return app
}
