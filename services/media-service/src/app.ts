import Fastify from 'fastify'
import { feedbackFilesRoutes, FeedbackFilesRepository } from './modules/feedback-files/index.ts'
import type { FastifyBaseLogger, FastifyInstance } from 'fastify'
import { errorHandler, health, idempotency, requestContext, serviceContext } from '@blog/http-kit'
import type { Logger } from '@blog/logger'
import type { ServiceMetrics } from '@blog/telemetry'
import type { Env } from './config/env.ts'
import type { DbHandle } from './infra/db/client.ts'
import { SocialCoverController, SocialCoverService, socialCoverRoutes } from './modules/social-cover/index.ts'
import type { CoverRenderer } from './modules/social-cover/index.ts'
import { MediaController, MediaRepository, MediaService, mediaRoutes } from './modules/media/index.ts'
import type { ObjectStore } from './modules/media/index.ts'
import { mediaSettingsRoutes } from './modules/media-settings/index.ts'
import type { MediaSettingsService } from './modules/media-settings/index.ts'
import { createMediaRuntime } from './media-runtime.ts'

export type AppDeps = {
  env: Env
  logger: Logger
  metrics: ServiceMetrics
  database: DbHandle
  store: ObjectStore
  media_settings?: MediaSettingsService
  renderer?: CoverRenderer
  is_broker_ready?: () => boolean
}

const BODY_LIMIT = 20 * 1024 * 1024

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const { env, logger, store } = deps
  const app: FastifyInstance = Fastify({ loggerInstance: logger as FastifyBaseLogger, trustProxy: true, bodyLimit: BODY_LIMIT })

  await app.register(requestContext, { logger })
  await app.register(idempotency)
  await app.register(errorHandler)
  await app.register(health, { metrics: deps.metrics, checks: [{ name: 'database', check: deps.database.isReady }, ...(deps.is_broker_ready ? [{ name: 'broker', check: async () => deps.is_broker_ready?.() ?? false }] : [])] })
  await app.register(serviceContext, { public_key_pem: env.SERVICE_JWT_PUBLIC_KEY })
  const media_settings = deps.media_settings ?? createMediaRuntime(env, deps.database, store)
  if (!deps.media_settings) app.addHook('onClose', async () => media_settings.close())
  await app.register(feedbackFilesRoutes, { service: new FeedbackFilesRepository(deps.database.db) })
  await app.register(mediaSettingsRoutes, { service: media_settings })
  await app.register(mediaRoutes, {
    controller: new MediaController(new MediaService(new MediaRepository(deps.database.db), store, env.S3_PUBLIC_URL, media_settings)),
  })

  if (deps.renderer) {
    const social_cover = new SocialCoverService(deps.renderer, store, env.S3_PUBLIC_URL, logger, media_settings)
    await app.register(socialCoverRoutes, { controller: new SocialCoverController(social_cover) })
  }

  return app
}
