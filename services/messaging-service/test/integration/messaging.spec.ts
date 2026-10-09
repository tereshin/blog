import { eq } from 'drizzle-orm'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { newEventId, processEvent } from '@blog/broker'
import type { OutboxEvent } from '@blog/broker'
import { conversationPageSchema, messageSchema } from '@blog/contracts'
import type { ServiceContext } from '@blog/contracts'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { errorHandler, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { conversations, messages, outbox } from '../../src/infra/db/schema.ts'
import { createConversationRepository, createUsersCopyHandler, conversationRoutes } from '../../src/modules/conversation/index.ts'
import { messageRoutes } from '../../src/modules/message/index.ts'

const ALICE = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const BORIS = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99'
const RITA = '4b1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a77'
const STRANGER = '8c1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a88'
const CONSUMER = 'messaging-test'

const guest: ServiceContext = { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' }

function member(user_id: string, is_restricted = false): ServiceContext {
  return { user_id, role: 'member', is_restricted, can_publish: true, viewer_key: `user:${user_id}` }
}

const viewers: Record<string, ServiceContext> = {
  alice: member(ALICE),
  boris: member(BORIS),
  rita: member(RITA, true),
  stranger: member(STRANGER),
}

function event(name: string, payload: Record<string, unknown>): OutboxEvent {
  return { event_id: newEventId(), name, occurred_at: '2026-10-08T12:00:00.000Z', correlation_id: 'test', causation_id: null, version: 1, ...payload }
}

const snapshot = { public_number: 7, role: 'member' as const, can_publish: true, is_restricted: false, created_at: '2026-01-01T00:00:00.000Z' }

describe('messaging: один диалог на пару (PostgreSQL в контейнере)', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    const repository = createConversationRepository(database.db)
    const apply = (item: OutboxEvent) => processEvent(database.db, CONSUMER, item, createUsersCopyHandler(repository))
    await apply(event('identity.user.created', { ...snapshot, user_id: ALICE, display_name: 'Анна' }))
    await apply(event('identity.user.created', { ...snapshot, user_id: BORIS, public_number: 8, display_name: 'Борис' }))
    await apply(event('identity.user.created', { ...snapshot, user_id: RITA, public_number: 9, display_name: 'Рита', is_restricted: true }))
    await apply(event('identity.user.created', { ...snapshot, user_id: STRANGER, public_number: 10, display_name: 'Чужой' }))
    await apply(event('content.profile.updated', { user_id: BORIS, display_name: 'Борис Читаев', avatar_url: null, slug: 'boris' }))

    app = Fastify()
    await app.register(requestContext, { logger: createLogger({ service: 'messaging-test', level: 'silent' }) })
    await app.register(errorHandler)
    app.decorateRequest('viewer', undefined as unknown as ServiceContext)
    app.addHook('onRequest', async (request) => {
      const key = request.headers['x-test-viewer']
      request.viewer = typeof key === 'string' && key in viewers ? (viewers[key] ?? guest) : guest
    })
    await app.register(conversationRoutes, { database })
    await app.register(messageRoutes, { database })
  }, 120_000)

  afterAll(async () => {
    await app.close()
    await database.close()
    await postgres.stop()
  })

  function send(viewer: string, peer: string, body: string, key?: string) {
    return app.inject({
      method: 'POST',
      url: `/v1/conversations/with/${peer}/messages`,
      headers: {
        'content-type': 'application/json',
        'x-test-viewer': viewer,
        ...(key ? { 'x-idempotency-key': key } : {}),
      },
      payload: { body },
    })
  }

  it('гость не видит диалоги, себе писать нельзя, ограниченный отклонён', async () => {
    expect((await app.inject({ method: 'GET', url: '/v1/conversations' })).statusCode).toBe(401)
    expect((await send('alice', ALICE, 'себе')).statusCode).toBe(422)
    expect((await send('alice', RITA, 'рите')).statusCode).toBe(403)
    expect((await send('rita', ALICE, 'от риты')).statusCode).toBe(403)
  })

  it('пара создаёт один диалог, повтор ключа не плодит сообщения, прочтение снимает непрочитанное', async () => {
    const first = await send('alice', BORIS, 'Первое письмо', 'once')
    expect(first.statusCode).toBe(201)
    const created = messageSchema.parse(first.json())
    const replay = await send('alice', BORIS, 'Первое письмо', 'once')
    expect(replay.statusCode).toBe(201)
    expect(messageSchema.parse(replay.json()).id).toBe(created.id)

    const second = await send('alice', BORIS, 'Второе письмо')
    expect(second.statusCode).toBe(201)
    expect(messageSchema.parse(second.json()).conversation_id).toBe(created.conversation_id)

    const rows = await database.db.select().from(conversations)
    expect(rows).toHaveLength(1)
    const stored = await database.db.select().from(messages)
    expect(stored).toHaveLength(2)
    const published = await database.db.select().from(outbox).where(eq(outbox.name, 'messaging.message.sent'))
    expect(published).toHaveLength(2)

    const list = await app.inject({ method: 'GET', url: '/v1/conversations', headers: { 'x-test-viewer': 'alice' } })
    const page = conversationPageSchema.parse(list.json())
    expect(page.items).toHaveLength(1)
    expect(page.items[0]?.peer.display_name).toBe('Борис Читаев')
    expect(page.items[0]?.peer.slug).toBe('boris')
    expect(page.items[0]?.unread_count).toBe(0)
    expect(page.items[0]?.last_message_excerpt).toContain('Второе')

    const unread = await app.inject({ method: 'GET', url: '/v1/conversations/unread-count', headers: { 'x-test-viewer': 'boris' } })
    expect(unread.json()).toEqual({ count: 2 })

    const foreign = await app.inject({
      method: 'GET',
      url: `/v1/conversations/${created.conversation_id}/messages`,
      headers: { 'x-test-viewer': 'stranger' },
    })
    expect(foreign.statusCode).toBe(404)

    const thread = await app.inject({
      method: 'GET',
      url: `/v1/conversations/${created.conversation_id}/messages`,
      headers: { 'x-test-viewer': 'boris' },
    })
    expect(thread.statusCode).toBe(200)
    expect(thread.json().items).toHaveLength(2)

    const read = await app.inject({
      method: 'POST',
      url: `/v1/conversations/${created.conversation_id}/read`,
      headers: { 'x-test-viewer': 'boris' },
    })
    expect(read.statusCode).toBe(204)
    const after = await app.inject({ method: 'GET', url: '/v1/conversations/unread-count', headers: { 'x-test-viewer': 'boris' } })
    expect(after.json()).toEqual({ count: 0 })
  })
})
