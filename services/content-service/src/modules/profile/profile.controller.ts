import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { pageQuerySchema, profileArticlePageSchema, profileSchema, profileStatsSchema, updateProfileSchema, userListPageSchema } from '@blog/contracts'
import type { ProfileListService } from './profile.lists.service.ts'
import type { ProfileService } from './profile.service.ts'

const ProfileParamsSchema = z.object({ slug: z.string().min(1) })
const ArticleQuerySchema = pageQuerySchema.extend({ sort: z.enum(['fresh', 'popular']).default('fresh') })

export class ProfileController {
  constructor(
    private readonly service: ProfileService,
    private readonly lists: ProfileListService,
  ) {}

  async get(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = ProfileParamsSchema.parse(request.params)
    return reply.send(profileSchema.parse(await this.service.getBySlug(request.viewer, slug)))
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const body = updateProfileSchema.parse(request.body)
    return reply.send(profileSchema.parse(await this.service.updateMe(request.viewer, body, request.correlation_id)))
  }

  async articles(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = ProfileParamsSchema.parse(request.params)
    const query = ArticleQuerySchema.parse(request.query)
    return reply.send(profileArticlePageSchema.parse(await this.lists.articles(request.viewer, slug, query)))
  }

  async followers(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = ProfileParamsSchema.parse(request.params)
    const query = pageQuerySchema.parse(request.query)
    return reply.send(userListPageSchema.parse(await this.lists.followers(request.viewer, slug, query)))
  }

  async following(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = ProfileParamsSchema.parse(request.params)
    const query = pageQuerySchema.parse(request.query)
    return reply.send(userListPageSchema.parse(await this.lists.following(request.viewer, slug, query)))
  }

  async stats(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(profileStatsSchema.parse(await this.lists.stats(request.viewer)))
  }

  async rating(request: FastifyRequest, reply: FastifyReply) {
    const query = pageQuerySchema.parse(request.query)
    return reply.send(userListPageSchema.parse(await this.lists.rating(query)))
  }
}
