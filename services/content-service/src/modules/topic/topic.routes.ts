import type { FastifyPluginAsync } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createFollowRepository, createFollowService } from '../follow/index.ts'
import { createTopicController } from './topic.controller.ts'
import { createTopicRepository } from './topic.repository.ts'
import { createTopicService } from './topic.service.ts'

export type TopicRoutesOptions = { database: DbHandle; media_url: string }

/** Чтение активно для всех. Создание, архив и порядок — только суперадминистратор. */
export const topicRoutes: FastifyPluginAsync<TopicRoutesOptions> = async (app, options) => {
  const follows = createFollowService(createFollowRepository(options.database.db))
  const controller = createTopicController(createTopicService(createTopicRepository(options.database.db), { media_url: options.media_url, follows }))
  app.get('/v1/topics', (request, reply) => controller.list(request, reply))
  app.post('/v1/topics', (request, reply) => controller.create(request, reply))
  app.put('/v1/topics/order', (request, reply) => controller.reorder(request, reply))
  app.patch('/v1/topics/:id', (request, reply) => controller.update(request, reply))
  app.get('/v1/topics/:slug', (request, reply) => controller.get(request, reply))
}
