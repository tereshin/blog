import Fastify from 'fastify'
import type { FastifyBaseLogger, FastifyInstance } from 'fastify'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import {
  createServiceClient,
  errorHandler,
  health,
  idempotency,
  requestContext,
  serviceContext,
} from '@blog/http-kit'
import type { Logger } from '@blog/logger'
import type { ServiceMetrics } from '@blog/telemetry'
import type { Env } from './config/env.ts'
import type { DbHandle } from './infra/db/client.ts'
import { lookupCommentMedia } from './infra/http/media-files.ts'
import { ArticleSnapshotRepository, ArticleSnapshotService } from './modules/article-snapshot/index.ts'
import { ArticleStateController, ArticleStateRepository, ArticleStateService, articleStateRoutes } from './modules/article-state/index.ts'
import { BookmarkController, BookmarkEvents, BookmarkRepository, BookmarkService, bookmarkRoutes } from './modules/bookmark/index.ts'
import {
  CommentController,
  CommentEvents,
  CommentInteractionController,
  CommentInteractionRepository,
  CommentInteractionService,
  CommentRepository,
  CommentService,
  CommentWriteRepository,
  CommentWriteService,
  commentInteractionRoutes,
  commentRoutes,
} from './modules/comment/index.ts'
import type { LookupFile } from './modules/comment/index.ts'
import { ReactionController, ReactionEvents, ReactionRepository, ReactionService, reactionRoutes } from './modules/reaction/index.ts'
import { ReactionCatalogRepository, ReactionCatalogService } from './modules/reaction-catalog/index.ts'
import { ReputationRepository, ReputationService } from './modules/reputation/index.ts'
import { SeenController, SeenRepository, SeenService, seenRoutes } from './modules/seen/index.ts'
import { ViewController, ViewEvents, ViewRepository, ViewService, viewRoutes } from './modules/view/index.ts'

export type AppDeps = {
  env: Env
  logger: Logger
  metrics: ServiceMetrics
  database: DbHandle
  is_broker_ready: () => boolean
}

export type ModuleDeps = { db: NodePgDatabase; lookup_file?: LookupFile | undefined }

/** Сборка модулей: репозитории, сервисы и контроллеры. Транзакция модулей — транзакция Drizzle. */
export function composeModules(deps: ModuleDeps) {
  const { db } = deps
  const counters = new ArticleSnapshotService(new ArticleSnapshotRepository())
  const comment_repository = new CommentRepository(db)
  const comment_writer = new CommentWriteService(new CommentWriteRepository(db), counters, new CommentEvents(), deps.lookup_file)
  const comments = new CommentService(comment_repository, comment_writer)
  return {
    comment: new CommentController(comments),
    comment_interaction: new CommentInteractionController(
      new CommentInteractionService(new CommentInteractionRepository(db), comments, comment_repository, comment_writer),
    ),
    reaction: new ReactionController(
      new ReactionService(
        new ReactionRepository(db),
        new ReactionCatalogService(new ReactionCatalogRepository()),
        counters,
        new ReputationService(new ReputationRepository()),
        new ReactionEvents(),
      ),
    ),
    bookmark: new BookmarkController(new BookmarkService(new BookmarkRepository(db), counters, new BookmarkEvents())),
    article_state: new ArticleStateController(new ArticleStateService(new ArticleStateRepository(db))),
    view: new ViewController(new ViewService(new ViewRepository(db), counters, new ViewEvents())),
    seen: new SeenController(new SeenService(new SeenRepository(db))),
  }
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
  // Служебный контекст проверяется на каждом маршруте без `config: { is_public: true }`.
  await app.register(serviceContext, { public_key_pem: env.SERVICE_JWT_PUBLIC_KEY })

  const media = createServiceClient({ name: 'media', base_url: env.MEDIA_URL })
  const controllers = composeModules({ db: deps.database.db, lookup_file: (url) => lookupCommentMedia(media, url) })
  await app.register(commentRoutes, { controller: controllers.comment })
  await app.register(commentInteractionRoutes, { controller: controllers.comment_interaction })
  await app.register(reactionRoutes, { controller: controllers.reaction })
  await app.register(bookmarkRoutes, { controller: controllers.bookmark })
  await app.register(articleStateRoutes, { controller: controllers.article_state })
  await app.register(viewRoutes, { controller: controllers.view })
  await app.register(seenRoutes, { controller: controllers.seen })

  return app
}
