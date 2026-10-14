import type { FastifyPluginAsync } from 'fastify'
import type { TopicController } from './topic.controller.ts'

export type TopicRoutesOptions = { controller: TopicController }

/** Чтение активно для всех. Создание, архив и порядок — только суперадминистратор. */
export const topicRoutes: FastifyPluginAsync<TopicRoutesOptions> = async (app, { controller }) => {
  app.get('/v1/topics', (request, reply) => controller.list(request, reply))
  app.post('/v1/topics', (request, reply) => controller.create(request, reply))
  app.put('/v1/topics/order', (request, reply) => controller.reorder(request, reply))
  app.patch('/v1/topics/:id', (request, reply) => controller.update(request, reply))
  app.get('/v1/topics/:slug', (request, reply) => controller.get(request, reply))
}
