import type { FastifyReply, FastifyRequest } from 'fastify'
import { createTopicSchema, topicListSchema, topicOrderSchema, topicSchema, updateTopicSchema } from '@blog/contracts'
import { topicIdParamsSchema, topicListQuerySchema, topicParamsSchema } from './topic.schema.ts'
import type { TopicService } from './topic.service.ts'

export function createTopicController(service: TopicService) {
  return {
    async list(request: FastifyRequest, reply: FastifyReply) {
      const query = topicListQuerySchema.parse(request.query)
      const topics = query.include_archived === '1' ? await service.listAll(request.viewer) : await service.listActive()
      return reply.send(topicListSchema.parse(topics))
    },
    async get(request: FastifyRequest, reply: FastifyReply) {
      const { slug } = topicParamsSchema.parse(request.params)
      return reply.send(topicSchema.parse(await service.getBySlug(slug)))
    },
    async create(request: FastifyRequest, reply: FastifyReply) {
      const body = createTopicSchema.parse(request.body)
      return reply.code(201).send(topicSchema.parse(await service.create(request.viewer, body)))
    },
    async update(request: FastifyRequest, reply: FastifyReply) {
      const { id } = topicIdParamsSchema.parse(request.params)
      const body = updateTopicSchema.parse(request.body)
      return reply.send(topicSchema.parse(await service.update(request.viewer, id, body)))
    },
    async reorder(request: FastifyRequest, reply: FastifyReply) {
      const body = topicOrderSchema.parse(request.body)
      return reply.send(topicListSchema.parse(await service.reorder(request.viewer, body.topic_ids)))
    },
  }
}
