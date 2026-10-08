import type { FastifyPluginAsync } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createTopicController } from './topic.controller.ts'
import { createTopicRepository } from './topic.repository.ts'
import { createTopicService } from './topic.service.ts'

export type TopicRoutesOptions = { database: DbHandle }

/** `GET /v1/topics` — активные темы по порядку; `GET /v1/topics/{slug}` — одна тема (архивная тоже). */
export const topicRoutes: FastifyPluginAsync<TopicRoutesOptions> = async (app, options) => {
  const controller = createTopicController(createTopicService(createTopicRepository(options.database.db)))
  app.get('/v1/topics', (request, reply) => controller.list(request, reply))
  app.get('/v1/topics/:slug', (request, reply) => controller.get(request, reply))
}
