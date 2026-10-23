import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import Fastify from 'fastify'
import type { FastifyBaseLogger, FastifyInstance } from 'fastify'
import {
  createServiceClient,
  errorHandler,
  health,
  idempotency,
  requestContext,
} from '@blog/http-kit'
import type { ServiceClient } from '@blog/http-kit'
import type { Logger } from '@blog/logger'
import type { ServiceMetrics } from '@blog/telemetry'
import type { Env } from './config/env.ts'
import { MaintenanceClient } from './infra/http/maintenance-client.ts'
import { MaintenanceService, maintenanceModule } from './modules/maintenance/index.ts'
import { ContentAccessClient } from './infra/http/content-access-client.ts'
import { IdentitySessionClient } from './infra/http/identity-session-client.ts'
import { EventsController, EventsService, eventsRoutes } from './modules/events/index.ts'
import {
  SiteAssetsController,
  SiteAssetsService,
  siteAssetsRoutes,
} from './modules/site-assets/index.ts'
import {
  PrerenderController,
  PrerenderService,
  prerenderRoutes,
} from './modules/prerender/index.ts'
import {
  memberDirectoryRoutes,
  ProxyController,
  ProxyService,
  proxyRoutes,
} from './modules/proxy/index.ts'
import {
  contentSecurityPolicy,
  imageOrigin,
  newCspNonce,
  rateLimitForPath,
  rateLimitGroup,
} from './modules/security/index.ts'
import {
  ContextSigner,
  SessionController,
  SessionService,
  sessionModule,
  sessionRoutes,
} from './modules/session/index.ts'
import type { CookieNames } from './modules/session/index.ts'

declare module 'fastify' {
  interface FastifyReply {
    csp_nonce: string
  }
}

export type AppDeps = {
  env: Env
  logger: Logger
  metrics: ServiceMetrics
  is_broker_ready: () => boolean
}

/** Долгоживущие клиенты и сервисы: main.ts запускает на них подписки брокера и закрывает при остановке. */
export type AppServices = {
  identity: ServiceClient
  content: ServiceClient
  web?: ServiceClient
  proxy: ProxyService
  sessions: SessionService
  events: EventsService
  signer: ContextSigner
}

export function composeServices(deps: Pick<AppDeps, 'env' | 'logger'>): AppServices {
  const { env, logger } = deps
  const identity = createServiceClient({ name: 'identity', base_url: env.IDENTITY_URL })
  const content = createServiceClient({ name: 'content', base_url: env.CONTENT_URL })
  const proxy = new ProxyService({
    identity: env.IDENTITY_URL,
    content: env.CONTENT_URL,
    discussion: env.DISCUSSION_URL,
    messaging: env.MESSAGING_URL,
    notification: env.NOTIFICATION_URL,
    media: env.MEDIA_URL,
  })
  const signer = new ContextSigner(env.SERVICE_JWT_PRIVATE_KEY)
  return {
    identity,
    content,
    web: createServiceClient({ name: 'web', base_url: env.WEB_ASSETS_URL ?? 'http://web:8080' }),
    proxy,
    sessions: new SessionService(new IdentitySessionClient(identity), proxy),
    events: new EventsService(new ContentAccessClient(content), logger, signer),
    signer,
  }
}

export function cookieNames(env: Env): CookieNames {
  return {
    session: env.SESSION_COOKIE_NAME,
    guest: env.GUEST_COOKIE_NAME,
    csrf: env.CSRF_COOKIE_NAME,
  }
}

/** Явный потолок JSON-тела; файлы идут в media-service со своим лимитом. */
const BODY_LIMIT_BYTES = 1_048_576
/** Сборка Fastify: плагины и хуки, маршруты модулей. Бизнес-логики здесь нет. */
export async function buildApp(deps: AppDeps, services: AppServices): Promise<FastifyInstance> {
  const { env, logger } = deps
  const cookies = cookieNames(env)

  const app: FastifyInstance = Fastify({
    loggerInstance: logger as FastifyBaseLogger,
    trustProxy: true,
    bodyLimit: BODY_LIMIT_BYTES,
  })

  await app.register(requestContext, { logger })
  await app.register(idempotency)
  await app.register(errorHandler)
  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: false,
    // Firebase popup sign-in must keep its opener across the provider redirect.
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  })
  app.decorateReply('csp_nonce', '')
  const image_origin = imageOrigin(env.S3_PUBLIC_URL)
  app.addHook('onRequest', async (_request, reply) => {
    const nonce = newCspNonce()
    reply.csp_nonce = nonce
    const emulator_host =
      env.APP_ENV === 'local' || env.APP_ENV === 'dev' ? env.FIREBASE_AUTH_EMULATOR_HOST : null
    reply.header(
      'Content-Security-Policy',
      contentSecurityPolicy({
        nonce,
        image_origin,
        auth_domain: env.FIREBASE_AUTH_DOMAIN,
        emulator_host,
      }),
    )
  })
  await app.register(cors, {
    origin: env.WEB_ORIGIN,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Idempotency-Key', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
  })
  await app.register(cookie)
  await app.register(rateLimit, {
    max: (request) => rateLimitForPath(request.url),
    // Ключ плагина по умолчанию — только IP, а потолок разный. Без группы один счётчик
    // сравнивается с самым низким потолком, и чтение сессии получает 429 после обычной загрузки страницы.
    keyGenerator: (request) => `${request.ip}:${rateLimitGroup(request.url)}`,
    timeWindow: '1 minute',
    allowList: (request) => request.routeOptions.config.is_public === true,
  })
  await app.register(health, {
    metrics: deps.metrics,
    checks: [{ name: 'broker', check: async () => deps.is_broker_ready() }],
  })
  await app.register(sessionModule, {
    cookies,
    sessions: services.sessions,
    signer: services.signer,
    logger,
  })

  await app.register(maintenanceModule, {
    service: new MaintenanceService(
      new MaintenanceClient(services.content, services.web),
      env.PUBLIC_ORIGIN,
    ),
  })

  // Каждый модуль маршрутов — отдельный контекст: у proxy тело идёт потоком, у events — разбирается как JSON.
  await app.register(eventsRoutes, { controller: new EventsController(services.events) })
  await app.register(sessionRoutes, {
    controller: new SessionController(services.sessions, cookies),
  })
  await app.register(siteAssetsRoutes, {
    controller: new SiteAssetsController(new SiteAssetsService(services.content, services.proxy)),
  })
  await app.register(prerenderRoutes, {
    controller: new PrerenderController(new PrerenderService(services.content, services.web)),
  })
  await app.register(memberDirectoryRoutes, {
    identity: services.identity,
    content: services.content,
  })
  await app.register(proxyRoutes, { controller: new ProxyController(services.proxy, cookies) })

  return app
}
