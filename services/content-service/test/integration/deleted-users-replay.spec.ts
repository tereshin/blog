import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { connectBroker, createIdempotentConsumer, newEventId, wasProcessed } from '@blog/broker'
import type { BrokerClient, RunningConsumer } from '@blog/broker'
import { startNats } from '@blog/broker/testing'
import type { TestNats } from '@blog/broker/testing'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { createLogger } from '@blog/logger'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { profiles, users_copy } from '../../src/infra/db/schema.ts'
import { CopiesHandler, startCopiesConsumers } from '../../src/modules/copies/index.ts'
import { DELETED_USERS_CONSUMER } from '../../src/modules/copies/deleted-users.consumer.ts'
import { ProfileRepository } from '../../src/modules/profile/profile.repository.ts'
import { ProfileListsRepository } from '../../src/modules/profile/profile.lists.ts'

const USER = '11111111-1111-4111-8111-111111111111'
const logger = createLogger({ service: 'deletion-replay-test', level: 'silent' })

describe('deletion replay after a rolling upgrade (Postgres + JetStream)', () => {
  let postgres: TestPostgres
  let nats: TestNats
  let database: DbHandle
  let broker: BrokerClient
  let consumer: RunningConsumer | undefined
  beforeAll(async () => {
    ;[postgres, nats] = await Promise.all([startPostgres(), startNats()])
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    broker = await connectBroker({ url: nats.url, name: 'deletion-replay-test' })
    await database.db
      .insert(users_copy)
      .values({ user_id: USER, public_number: 2, created_at: new Date() })
    await database.db
      .insert(profiles)
      .values({ user_id: USER, display_name: 'Deleted', slug: null })
  }, 120_000)
  afterAll(async () => {
    await consumer?.stop()
    await broker?.close()
    await database?.close()
    await nats?.stop()
    await postgres?.stop()
  })

  it('repairs an acknowledged deletion, hides the profile and Discovery row, and survives restart', async () => {
    const deps = { db: database.db, broker, logger }
    consumer = await createIdempotentConsumer({
      ...deps,
      durable: 'content-copies-users',
      subject: 'identity.user.>',
      handler: async (tx, event) => {
        await new CopiesHandler().handle(tx, { ...event, is_deleted: false })
      },
    })
    const event = {
      event_id: newEventId(),
      name: 'identity.user.restricted',
      version: 1,
      occurred_at: new Date().toISOString(),
      correlation_id: 'test',
      causation_id: null,
      user_id: USER,
      public_number: 2,
      role: 'member',
      can_publish: false,
      is_restricted: true,
      is_deleted: true,
      created_at: new Date().toISOString(),
    }
    await broker.js.publish(event.name, JSON.stringify(event), { msgID: event.event_id })
    await expect
      .poll(() => wasProcessed(database.db, 'content-copies-users', event.event_id))
      .toBe(true)
    expect(await new ProfileRepository(database.db).findByPublicNumber(2, undefined)).not.toBeNull()
    await consumer.stop()
    consumer = undefined

    consumer = await startCopiesConsumers(deps)
    await expect
      .poll(() => wasProcessed(database.db, DELETED_USERS_CONSUMER, event.event_id))
      .toBe(true)
    expect(await new ProfileRepository(database.db).findByPublicNumber(2, undefined)).toBeNull()
    expect(await new ProfileListsRepository(database.db).rating(null, 5)).toEqual([])
    expect(
      (await database.db.select().from(users_copy).where(eq(users_copy.user_id, USER)))[0]
        ?.is_deleted,
    ).toBe(true)
    await consumer.stop()
    consumer = undefined
    consumer = await startCopiesConsumers(deps)
    expect(await new ProfileRepository(database.db).findByPublicNumber(2, undefined)).toBeNull()
  }, 30_000)
})
