import type { FastifyPluginAsync } from 'fastify'
import type { ProfileController } from './profile.controller.ts'

export type ProfileRoutesOptions = { controller: ProfileController }

/** `GET /v1/profiles/{slug}` — короткий адрес, затем номер или UUID. `PUT /v1/profiles/me` — свой профиль. */
export const profileRoutes: FastifyPluginAsync<ProfileRoutesOptions> = async (
  app,
  { controller },
) => {
  app.get('/v1/admin/profiles', (request, reply) => controller.directory(request, reply))
  app.get('/internal/admin/profiles', (request, reply) => controller.directory(request, reply))
  app.patch('/v1/admin/profiles/:id', (request, reply) => controller.updateMember(request, reply))
  app.get('/v1/profiles/me/stats', (request, reply) => controller.stats(request, reply))
  app.get('/v1/rating', (request, reply) => controller.rating(request, reply))
  app.get('/v1/profiles/:slug/articles', (request, reply) => controller.articles(request, reply))
  app.get('/v1/profiles/:slug/followers', (request, reply) => controller.followers(request, reply))
  app.get('/v1/profiles/:slug/following', (request, reply) => controller.following(request, reply))
  app.get('/v1/profiles/:slug', (request, reply) => controller.get(request, reply))
  app.put('/v1/profiles/me', (request, reply) => controller.update(request, reply))
}
