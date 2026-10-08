import type { FastifyReply, FastifyRequest } from 'fastify'
import { topicListSchema, topicSchema } from '@blog/contracts'
import { topicParamsSchema } from './topic.schema.ts'
import type { TopicService } from './topic.service.ts'

export function createTopicController(service: TopicService) {
  return {
    async list(_request: FastifyRequest, reply: FastifyReply) {
      return reply.send(topicListSchema.parse(await service.listActive()))
    },
    async get(request: FastifyRequest, reply: FastifyReply) {
      const { slug } = topicParamsSchema.parse(request.params)
      return reply.send(topicSchema.parse(await service.getBySlug(slug)))
    },
  }
}
