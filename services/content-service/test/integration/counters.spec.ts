import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { newEventId, processEvent } from '@blog/broker'
import type { OutboxEvent } from '@blog/broker'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { articles, profiles, topics } from '../../src/infra/db/schema.ts'
import { createCountersHandler } from '../../src/modules/counters/index.ts'

const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const ARTICLE = '7a1c2d30-1111-4a11-8a11-000000000020'
const TOPIC = '5f0f6a52-0d8b-4f6e-a8b1-000000000099'
const CONSUMER = 'test-counters'

function event(name: string, payload: Record<string, unknown>): OutboxEvent {
  return { event_id: newEventId(), name, occurred_at: '2026-10-08T10:00:00.000Z', correlation_id: 'test', causation_id: null, version: 1, ...payload }
}

const counters = {
  article_id: ARTICLE,
  reaction_counts: { laugh: 2, heart: 1, thumb: 0, fire: 0 },
  reaction_count: 3,
  comment_count: 4,
  view_count: 9,
  bookmark_count: 2,
  top_comment: { id: '7a1c2d30-1111-4a11-8a11-000000000021', author_id: AUTHOR, body: 'Коротко', reaction_count: 1, reply_count: 0 },
}

describe('content: счётчики из событий обсуждения (PostgreSQL в контейнере)', () => {
  let postgres: TestPostgres
  let database: DbHandle
  const handler = createCountersHandler()
  const apply = (item: OutboxEvent) => processEvent(database.db, CONSUMER, item, handler)

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    await database.db.insert(topics).values({ id: TOPIC, title: 'Тема', slug: 'tema', status: 'active', position: 1 })
    await database.db.insert(articles).values({
      id: ARTICLE,
      author_id: AUTHOR,
      topic_id: TOPIC,
      title: 'Статья',
      slug: 'statya',
      blocks: [],
      visibility: 'public',
      status: 'published',
      published_at: new Date('2026-10-01T00:00:00.000Z'),
    })
    await database.db.insert(profiles).values({ user_id: AUTHOR, display_name: 'Автор' })
  }, 120_000)

  afterAll(async () => {
    await database?.close()
    await postgres?.stop()
  })

  it('событие дважды — числа те же', async () => {
    const counters_event = event('discussion.article_counters.updated', counters)
    expect(await apply(counters_event)).toBe('ok')
    expect(await apply(counters_event)).toBe('duplicate')
    const [row] = await database.db.select().from(articles).where(eq(articles.id, ARTICLE))
    expect(row).toMatchObject({ reaction_count: 3, comment_count: 4, view_count: 9, bookmark_count: 2 })
    expect(row?.reaction_counts).toEqual(counters.reaction_counts)
    expect(row?.top_comment).toMatchObject({ id: counters.top_comment.id })

    const reputation = event('discussion.reputation.updated', { user_id: AUTHOR, reputation: 15 })
    expect(await apply(reputation)).toBe('ok')
    expect(await apply(reputation)).toBe('duplicate')
    const [profile] = await database.db.select().from(profiles).where(eq(profiles.user_id, AUTHOR))
    expect(profile?.reputation).toBe(15)
  })
})
