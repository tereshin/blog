import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import type { ServiceContext } from '@blog/contracts'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { articles_copy, reactions } from '../../src/infra/db/schema.ts'
import { createReactionRepository, createReactionService } from '../../src/modules/reaction/index.ts'

const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const ALICE = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a91'
const BORIS = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a92'
const ARTICLE = '7a1c2d30-1111-4a11-8a11-000000000010'

function viewer(user_id: string): ServiceContext {
  return { user_id, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${user_id}` }
}

describe('discussion: реакции (PostgreSQL в контейнере)', () => {
  let postgres: TestPostgres
  let database: DbHandle

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    await database.db.insert(articles_copy).values({
      article_id: ARTICLE,
      author_id: AUTHOR,
      title: 'Заметка',
      slug: 'zametka',
      visibility: 'public',
      status: 'published',
      comments_enabled: true,
      published_at: new Date('2026-10-01T00:00:00.000Z'),
    })
  }, 120_000)

  afterAll(async () => {
    await database?.close()
    await postgres?.stop()
  })

  it('двое ставят один вид — две реакции; повтор одного снимает его и оставляет одну; тот же ключ не снимает чужую', async () => {
    const service = createReactionService(createReactionRepository(database.db))
    const body = { target_type: 'article' as const, target_id: ARTICLE, kind: 'laugh' as const }
    const count = async () => (await database.db.select().from(reactions).where(eq(reactions.target_id, ARTICLE))).length

    await Promise.all([
      service.react({ viewer: viewer(ALICE), body, idempotency_key: 'alice-1', correlation_id: 'c' }),
      service.react({ viewer: viewer(BORIS), body, idempotency_key: 'boris-1', correlation_id: 'c' }),
    ])
    expect(await count()).toBe(2)

    const removed = await service.react({ viewer: viewer(ALICE), body, idempotency_key: 'alice-2', correlation_id: 'c' })
    expect(removed.my_reaction).toBeNull()
    expect(await count()).toBe(1)

    const replay = await service.react({ viewer: viewer(BORIS), body, idempotency_key: 'boris-1', correlation_id: 'c' })
    expect(replay.my_reaction).toBe('laugh')
    expect(await count()).toBe(1)

    const [row] = await database.db.select().from(reactions).where(eq(reactions.target_id, ARTICLE))
    expect(row).toMatchObject({ user_id: BORIS, target_type: 'article', target_id: ARTICLE, kind: 'laugh' })
    expect(row).not.toHaveProperty('emoji')
    expect(row).not.toHaveProperty('image_url')
    expect(row).not.toHaveProperty('presentation')
    expect(Object.keys(replay).sort()).toEqual(['my_reaction', 'reaction_count', 'reaction_counts'])
  })
})
