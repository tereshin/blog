import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import Fastify from 'fastify'
import type { FastifyBaseLogger, FastifyInstance } from 'fastify'
import { errorHandler, health, requestContext } from '@blog/http-kit'
import type { Logger } from '@blog/logger'
import type { ServiceMetrics } from '@blog/telemetry'
import type { Env } from './config/env.ts'
import { eventsRoutes } from './modules/events/index.ts'
import type { EventsService } from './modules/events/index.ts'
import { proxyRoutes } from './modules/proxy/index.ts'
import type { ProxyService } from './modules/proxy/index.ts'
import { sessionModule } from './modules/session/index.ts'
import type { ContextSigner, CookieNames, SessionService } from './modules/session/index.ts'

export type AppDeps = {
  env: Env
  logger: Logger
  metrics: ServiceMetrics
  sessions: SessionService
  signer: ContextSigner
  proxy: ProxyService
  events: EventsService
  is_broker_ready: () => boolean
}

const RATE_LIMIT_PER_MINUTE = 600

export function cookieNames(env: Env): CookieNames {
  return { session: env.SESSION_COOKIE_NAME, guest: env.GUEST_COOKIE_NAME, csrf: env.CSRF_COOKIE_NAME }
}

/** Сборка Fastify: плагины и хуки, маршруты модулей. Бизнес-логики здесь нет. */
export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const { env, logger } = deps
  const cookies = cookieNames(env)

  const app: FastifyInstance = Fastify({ loggerInstance: logger as FastifyBaseLogger, trustProxy: true })

  await app.register(requestContext, { logger })
  await app.register(errorHandler)
  await app.register(helmet, { global: true })
  await app.register(cors, {
    origin: env.WEB_ORIGIN,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Idempotency-Key', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
  })
  await app.register(cookie)
  await app.register(rateLimit, {
    max: RATE_LIMIT_PER_MINUTE,
    timeWindow: '1 minute',
    allowList: (request) => request.routeOptions.config.is_public === true,
  })
  await app.register(health, {
    metrics: deps.metrics,
    checks: [{ name: 'broker', check: async () => deps.is_broker_ready() }],
  })
  await app.register(sessionModule, { cookies, sessions: deps.sessions, signer: deps.signer, logger })

  // Каждый модуль маршрутов — отдельный контекст: у proxy тело идёт потоком, у events — разбирается как JSON.
  await app.register(eventsRoutes, { events: deps.events })
  await app.register(proxyRoutes, { proxy: deps.proxy, cookies })

  return app
}
