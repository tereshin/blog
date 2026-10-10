import type { FastifyPluginAsync } from 'fastify'
import type { DbHandle } from '../../infra/db/client.ts'
import { createProfileController } from './profile.controller.ts'
import { createProfileLists } from './profile.lists.ts'
import { createProfileListService } from './profile.lists.service.ts'
import { createProfileRepository } from './profile.repository.ts'
import { createSettingsService, createSettingsRepository } from '../settings/index.ts'
import { createProfileService } from './profile.service.ts'

export type ProfileRoutesOptions = {
  database: DbHandle
  media_url: string
  public_origin: string
  media_public_url?: string
}

/** `GET /v1/profiles/{slug}` — короткий адрес, затем номер. `PUT /v1/profiles/me` — свой профиль. */
export const profileRoutes: FastifyPluginAsync<ProfileRoutesOptions> = async (app, options) => {
  const settings = createSettingsService(createSettingsRepository(options.database.db), {
    media_url: options.media_public_url ?? options.media_url,
  })
  const profiles = createProfileService(createProfileRepository(options.database.db), {
    media_bases: [options.media_public_url ?? options.media_url, options.public_origin],
    isStatusIconAvailable: async (id) => (await settings.getPublic()).profile_status_icons.some((icon) => icon.id === id),
  })
  const controller = createProfileController(profiles, createProfileListService(createProfileLists(options.database.db), profiles))
  app.get('/v1/profiles/me/stats', (request, reply) => controller.stats(request, reply))
  app.get('/v1/rating', (request, reply) => controller.rating(request, reply))
  app.get('/v1/profiles/:slug/articles', (request, reply) => controller.articles(request, reply))
  app.get('/v1/profiles/:slug/followers', (request, reply) => controller.followers(request, reply))
  app.get('/v1/profiles/:slug/following', (request, reply) => controller.following(request, reply))
  app.get('/v1/profiles/:slug', (request, reply) => controller.get(request, reply))
  app.put('/v1/profiles/me', (request, reply) => controller.update(request, reply))
}
