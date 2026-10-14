import type { FastifyReply, FastifyRequest } from 'fastify'
import { createTopicSchema, topicDetailSchema, topicListSchema, topicOrderSchema, topicSchema, updateTopicSchema } from '@blog/contracts'
import { TopicIdParamsSchema, TopicListQuerySchema, TopicParamsSchema } from './topic.schema.ts'
import type { TopicService } from './topic.service.ts'

type TopicUseCases = Pick<TopicService<never>, 'listActive' | 'listAll' | 'getBySlug' | 'create' | 'update' | 'reorder'>

export class TopicController {
  constructor(private readonly service: TopicUseCases) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = TopicListQuerySchema.parse(request.query)
    const topics = query.include_archived === '1' ? await this.service.listAll(request.viewer) : await this.service.listActive()
    return reply.send(topicListSchema.parse(topics))
  }

  async get(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = TopicParamsSchema.parse(request.params)
    return reply.send(topicDetailSchema.parse(await this.service.getBySlug(request.viewer, slug)))
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createTopicSchema.parse(request.body)
    return reply.code(201).send(topicSchema.parse(await this.service.create(request.viewer, body)))
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = TopicIdParamsSchema.parse(request.params)
    const body = updateTopicSchema.parse(request.body)
    return reply.send(topicSchema.parse(await this.service.update(request.viewer, id, body)))
  }

  async reorder(request: FastifyRequest, reply: FastifyReply) {
    const body = topicOrderSchema.parse(request.body)
    return reply.send(topicListSchema.parse(await this.service.reorder(request.viewer, body.topic_ids)))
  }
}
