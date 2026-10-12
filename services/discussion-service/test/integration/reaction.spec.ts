import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import type { ServiceContext } from '@blog/contracts'
import { ValidationError } from '@blog/errors'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { articles_copy, reaction_catalog, reactions } from '../../src/infra/db/schema.ts'
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

  it('новый вид ставится только пока он в каталоге, снятый не ставится, своя снятая реакция снимается', async () => {
    const service = createReactionService(createReactionRepository(database.db))
    const rocket = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    const before = await database.db.select().from(reactions)
    const place = (user_id: string, kind: string, idempotency_key: string) =>
      service.react({
        viewer: viewer(user_id),
        body: { target_type: 'article', target_id: ARTICLE, kind },
        idempotency_key,
        correlation_id: 'c',
      })

    await expect(place(ALICE, rocket, 'alice-unknown')).rejects.toThrow(ValidationError)
    expect(await database.db.select().from(reactions)).toEqual(before)

    await database.db.insert(reaction_catalog).values({ kind: rocket })
    const placed = await place(ALICE, rocket, 'alice-rocket')
    expect(placed.my_reaction).toBe(rocket)
    expect(placed.reaction_counts[rocket]).toBe(1)
    expect(placed.reaction_counts['laugh']).toBe(1)

    await database.db.delete(reaction_catalog).where(eq(reaction_catalog.kind, rocket))
    await expect(place(BORIS, rocket, 'boris-rocket')).rejects.toThrow(ValidationError)
    const removed = await place(ALICE, rocket, 'alice-rocket-off')
    expect(removed.my_reaction).toBeNull()
    expect(removed.reaction_counts[rocket]).toBeUndefined()

    const heart = await place(ALICE, 'heart', 'alice-heart')
    expect(heart.my_reaction).toBe('heart')
    expect(heart.reaction_counts['heart']).toBe(1)
    expect(heart.reaction_counts['laugh']).toBe(1)
  })
})
