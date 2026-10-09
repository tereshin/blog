import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ServiceContext } from '@blog/contracts'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { errorHandler, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { bookmarkRoutes } from '../../src/modules/bookmark/index.ts'
import { commentRoutes } from '../../src/modules/comment/index.ts'
import { reactionRoutes } from '../../src/modules/reaction/index.ts'

const MEMBER = '6b1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a66'
const ARTICLE = '00000000-0000-4000-8000-000000000401'

const restricted: ServiceContext = {
  user_id: MEMBER,
  role: 'member',
  is_restricted: true,
  can_publish: false,
  viewer_key: `user:${MEMBER}`,
}

describe('discussion: ограниченный участник', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    app = Fastify()
    await app.register(requestContext, { logger: createLogger({ service: 'discussion-test', level: 'silent' }) })
    await app.register(errorHandler)
    app.decorateRequest('viewer', undefined as unknown as ServiceContext)
    app.addHook('onRequest', async (request) => {
      request.viewer = restricted
    })
    await app.register(commentRoutes, { database })
    await app.register(reactionRoutes, { database })
    await app.register(bookmarkRoutes, { database })
  }, 120_000)

  afterAll(async () => {
    await app.close()
    await database.close()
    await postgres.stop()
  })

  it('комментарий, реакция и закладка отклоняются с кодом restricted', async () => {
    const comment = await app.inject({
      method: 'POST',
      url: `/v1/articles/${ARTICLE}/comments`,
      headers: { 'content-type': 'application/json' },
      payload: { body: 'Нельзя' },
    })
    const reaction = await app.inject({
      method: 'POST',
      url: '/v1/reactions',
      headers: { 'content-type': 'application/json' },
      payload: { target_type: 'article', target_id: ARTICLE, kind: 'heart' },
    })
    const bookmark = await app.inject({ method: 'PUT', url: `/v1/bookmarks/${ARTICLE}` })
    for (const response of [comment, reaction, bookmark]) {
      expect(response.statusCode).toBe(403)
      expect(response.json()).toMatchObject({ code: 'restricted' })
    }
  })
})
