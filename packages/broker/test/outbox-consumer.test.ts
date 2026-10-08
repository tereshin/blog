import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createDb } from '@blog/db-kit'
import type { DbHandle } from '@blog/db-kit'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { createLogger } from '@blog/logger'
import { OutboxRelay, appendToOutbox, connectBroker, createIdempotentConsumer, newEventId, outbox, processEvent } from '../src/index.ts'
import type { BrokerClient, EventHandler, OutboxEvent } from '../src/index.ts'
import { startNats } from '../src/testing.ts'
import type { TestNats } from '../src/testing.ts'

const logger = createLogger({ service: 'broker-test', level: 'silent' })

const SCHEMA = `
create table outbox (id uuid primary key, name text not null, payload jsonb not null,
  created_at timestamptz not null default now(), published_at timestamptz);
create table processed_events (event_id uuid not null, consumer text not null,
  processed_at timestamptz not null default now(), primary key (consumer, event_id));
create table effects (event_id uuid, note text);
`

function event(name: string, extra: Record<string, unknown> = {}): OutboxEvent {
  return {
    event_id: newEventId(),
    name,
    occurred_at: new Date().toISOString(),
    correlation_id: 'test',
    causation_id: null,
    version: 1,
    ...extra,
  }
}

async function waitFor(check: () => Promise<boolean>, timeout_ms = 15_000): Promise<void> {
  const deadline = Date.now() + timeout_ms
  while (Date.now() < deadline) {
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('условие не наступило вовремя')
}

describe('broker: outbox → JetStream → идемпотентный потребитель', () => {
  let postgres: TestPostgres
  let nats: TestNats
  let database: DbHandle
  let broker: BrokerClient

  beforeAll(async () => {
    ;[postgres, nats] = await Promise.all([startPostgres(), startNats()])
    database = createDb({ url: postgres.url })
    await database.pool.query(SCHEMA)
    broker = await connectBroker({ url: nats.url, name: 'broker-test' })
  }, 180_000)

  afterAll(async () => {
    await broker.close()
    await database.close()
    await Promise.all([postgres.stop(), nats.stop()])
  })

  it('processEvent: повторная доставка того же event_id не меняет данные', async () => {
    const e = event('identity.user.updated')
    const handler: EventHandler = async (tx) => {
      await tx.execute(sql`insert into effects (event_id, note) values (${e.event_id}, 'x')`)
    }
    expect(await processEvent(database.db, 'c1', e, handler)).toBe('ok')
    expect(await processEvent(database.db, 'c1', e, handler)).toBe('duplicate')
    expect((await database.pool.query('select 1 from effects where event_id = $1', [e.event_id])).rowCount).toBe(1)
    // Другой потребитель то же событие обрабатывает независимо.
    expect(await processEvent(database.db, 'c2', e, async () => undefined)).toBe('ok')
  })

  it('откат обработчика откатывает и отметку о том, что событие обработано', async () => {
    const e = event('identity.user.updated')
    await expect(
      processEvent(database.db, 'c1', e, async () => {
        throw new Error('сбой')
      }),
    ).rejects.toThrow('сбой')
    expect(await processEvent(database.db, 'c1', e, async () => undefined)).toBe('ok')
  })

  it('событие из outbox доходит до потребителя один раз, даже если релей публикует его повторно', async () => {
    const received: string[] = []
    const consumer = await createIdempotentConsumer({
      db: database.db,
      broker,
      logger,
      durable: 'test-identity-updated',
      subject: 'identity.user.updated',
      handler: async (_tx, e) => {
        received.push(e.event_id)
      },
    })
    const e = event('identity.user.updated')
    await database.db.transaction((tx) => appendToOutbox(tx, e))

    const relay = new OutboxRelay({ db: database.db, broker, logger })
    expect(await relay.flushOnce()).toBe(1)
    // Релей упал после публикации, до отметки published_at: событие уходит повторно, JetStream отсекает по msgID.
    await database.db.update(outbox).set({ published_at: null }).where(eq(outbox.id, e.event_id))
    expect(await relay.flushOnce()).toBe(1)

    await waitFor(async () => received.includes(e.event_id))
    await new Promise((resolve) => setTimeout(resolve, 500))
    expect(received.filter((id) => id === e.event_id)).toHaveLength(1)
    await consumer.stop()
  })

  it('после исчерпания попыток событие уходит в DLQ', async () => {
    let attempts = 0
    const consumer = await createIdempotentConsumer({
      db: database.db,
      broker,
      logger,
      durable: 'test-content-hidden',
      subject: 'content.article.hidden',
      max_deliver: 2,
      handler: async () => {
        attempts += 1
        throw new Error('всегда падает')
      },
    })
    await broker.js.publish('content.article.hidden', JSON.stringify(event('content.article.hidden')))
    await waitFor(async () => attempts >= 2, 30_000)
    await waitFor(async () => {
      const info = await broker.jsm.streams.info('content-dlq')
      return info.state.messages >= 1
    }, 30_000)
    await consumer.stop()
  }, 60_000)
})
