import Fastify from 'fastify'
import type { FastifyBaseLogger, FastifyInstance } from 'fastify'
import { errorHandler, health, idempotency, requestContext, serviceContext } from '@blog/http-kit'
import type { Logger } from '@blog/logger'
import type { ServiceMetrics } from '@blog/telemetry'
import type { Env } from './config/env.ts'
import type { DbHandle } from './infra/db/client.ts'
import { FirebaseClient } from './infra/http/firebase-client.ts'
import { AuthController, AuthRepository, AuthService, authRoutes } from './modules/auth/index.ts'
import { SessionController, SessionRepository, SessionService, sessionRoutes } from './modules/session/index.ts'
import { UserController, UserRepository, UserService, userRoutes } from './modules/user/index.ts'

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
  const app: FastifyInstance = Fastify({ loggerInstance: logger as FastifyBaseLogger, trustProxy: true, bodyLimit: BODY_LIMIT_BYTES })

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
  // Служебный контекст проверяется на каждом маршруте без `config: { is_public: true }`.
  await app.register(serviceContext, { public_key_pem: env.SERVICE_JWT_PUBLIC_KEY })

  const firebase = new FirebaseClient({
    project_id: env.FIREBASE_PROJECT_ID,
    server_api_key: env.FIREBASE_SERVER_API_KEY,
    client_email: env.FIREBASE_CLIENT_EMAIL,
    private_key: env.FIREBASE_PRIVATE_KEY,
    emulator_host: env.FIREBASE_AUTH_EMULATOR_HOST,
  })
  app.addHook('onClose', () => firebase.close())
  const auth_service = new AuthService(new AuthRepository(deps.database.db), firebase, app.log, {
    superadmin_email: env.SUPERADMIN_EMAIL,
    session_ttl_days: env.SESSION_TTL_DAYS,
    web_api_key: env.FIREBASE_WEB_API_KEY,
    auth_domain: env.FIREBASE_AUTH_DOMAIN,
    project_id: env.FIREBASE_PROJECT_ID,
    emulator_host: env.FIREBASE_AUTH_EMULATOR_HOST ?? null,
    seed_password: env.SEED_AUTH_PASSWORD ?? null,
  })

  await app.register(sessionRoutes, { controller: new SessionController(new SessionService(new SessionRepository(deps.database.db))) })
  await app.register(authRoutes, { controller: new AuthController(auth_service) })
  await app.register(userRoutes, { controller: new UserController(new UserService(new UserRepository(deps.database.db))) })

  return app
}
