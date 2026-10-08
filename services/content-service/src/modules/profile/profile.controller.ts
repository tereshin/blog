import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { pageQuerySchema, profileArticlePageSchema, profileSchema, profileStatsSchema, updateProfileSchema, userListPageSchema } from '@blog/contracts'
import type { ProfileListService } from './profile.lists.service.ts'
import type { ProfileService } from './profile.types.ts'

const paramsSchema = z.object({ slug: z.string().min(1) })
const articleQuerySchema = pageQuerySchema.extend({ sort: z.enum(['fresh', 'popular']).default('fresh') })

export function createProfileController(service: ProfileService, lists: ProfileListService) {
  return {
    async get(request: FastifyRequest, reply: FastifyReply) {
      const { slug } = paramsSchema.parse(request.params)
      return reply.send(profileSchema.parse(await service.getBySlug(request.viewer, slug)))
    },
    async update(request: FastifyRequest, reply: FastifyReply) {
      const body = updateProfileSchema.parse(request.body)
      return reply.send(profileSchema.parse(await service.updateMe(request.viewer, body, request.correlation_id)))
    },
    async articles(request: FastifyRequest, reply: FastifyReply) {
      const { slug } = paramsSchema.parse(request.params)
      const query = articleQuerySchema.parse(request.query)
      return reply.send(profileArticlePageSchema.parse(await lists.articles(request.viewer, slug, query)))
    },
    async followers(request: FastifyRequest, reply: FastifyReply) {
      const { slug } = paramsSchema.parse(request.params)
      const query = pageQuerySchema.parse(request.query)
      return reply.send(userListPageSchema.parse(await lists.followers(request.viewer, slug, query)))
    },
    async following(request: FastifyRequest, reply: FastifyReply) {
      const { slug } = paramsSchema.parse(request.params)
      const query = pageQuerySchema.parse(request.query)
      return reply.send(userListPageSchema.parse(await lists.following(request.viewer, slug, query)))
    },
    async stats(request: FastifyRequest, reply: FastifyReply) {
      return reply.send(profileStatsSchema.parse(await lists.stats(request.viewer)))
    },
    async rating(request: FastifyRequest, reply: FastifyReply) {
      const query = pageQuerySchema.parse(request.query)
      return reply.send(userListPageSchema.parse(await lists.rating(query)))
    },
  }
}
