import { generateKeyPairSync } from 'node:crypto'
import { jwtVerify } from 'jose'
import { describe, expect, it, vi } from 'vitest'
import { createLogger } from '@blog/logger'
import { EventsService } from '../../src/modules/events/events.service.ts'
import type { Connection } from '../../src/modules/events/events.types.ts'
import { ContextSigner } from '../../src/modules/session/context-signer.ts'

const ARTICLE = '00000000-0000-4000-8000-000000000001'
const event = {
  name: 'content.article.updated', article_id: ARTICLE,
  visibility: 'public', status: 'published', occurred_at: '2026-10-23T15:00:00.000Z',
}
const logger = createLogger({ service: 'gateway-test', level: 'silent' })
function connection(id = 'guest:1'): Connection {
  return {
    id, viewer: { role: 'guest', viewer_key: id, can_publish: false, is_restricted: false },
    article_ids: new Set(), conversation_ids: new Set(), feed_key: null,
    notifications: false, write: () => true, close: () => {},
  }
}
function register(events: EventsService, connection: Connection): void {
  events.register(connection)
  events.registry.replace(connection, {
    article_ids: [ARTICLE], conversation_ids: [], feed_key: null, notifications: false,
  })
}

describe('background article access checks', () => {
  it('uses a fresh signed context after the subscription JWT expires', async () => {
    let now = Date.parse(event.occurred_at)
    const keys = generateKeyPairSync('ed25519')
    const signer = new ContextSigner(keys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(), () => now)
    const reader = connection()
    const tokens: string[] = []
    const events = new EventsService({ check: async (token) => {
      await jwtVerify(token, keys.publicKey, { currentDate: new Date(now) })
      tokens.push(token)
      return { can_read: true, visibility: 'public', status: 'published', author_id: ARTICLE }
    } }, logger, signer)
    events.register(reader)
    const original = await signer.sign(reader.viewer)
    await events.subscribe(reader, original, { connection_id: reader.id, article_ids: [ARTICLE], conversation_ids: [], notifications: false })
    now += 61_000
    await expect(jwtVerify(original, keys.publicKey, { currentDate: new Date(now) })).rejects.toThrow()
    events.dispatch(event)
    await events.settle()
    expect(tokens).toHaveLength(2)
    expect(tokens[1]).not.toBe(original)
    expect(events.registry.forArticle(ARTICLE)).toEqual([reader])
  })

  it('contains a rejected access check and continues checking later batches', async () => {
    const warn = vi.spyOn(logger, 'warn')
    const check = vi.fn(async (jwt: string) => {
      if (jwt === 'guest:0') throw new Error('content: неожиданный ответ 401')
      return { can_read: true, visibility: 'public' as const, status: 'published' as const, author_id: ARTICLE }
    })
    const events = new EventsService({ check }, logger, { sign: async (viewer) => viewer.viewer_key })
    for (let index = 0; index < 10; index++) register(events, connection(`guest:${index}`))
    events.dispatch(event)
    // Allow the formerly unhandled rejection to surface before awaiting tracked work.
    await new Promise<void>((resolve) => setImmediate(resolve))
    await expect(events.settle()).resolves.toBeUndefined()
    expect(check).toHaveBeenCalledTimes(10)
    expect(warn).toHaveBeenCalledOnce()
    expect(events.registry.forArticle(ARTICLE).map((reader) => reader.id)).not.toContain('guest:0')
    expect(events.registry.forArticle(ARTICLE)).toHaveLength(9)
    warn.mockRestore()
  })

  it('drops a subscription if signing fails or the article no longer exists', async () => {
    for (const signing_fails of [false, true]) {
      const events = new EventsService({ check: async () => null }, logger, {
        sign: async () => { if (signing_fails) throw new Error('signing failed'); return 'jwt' },
      })
      register(events, connection())
      events.dispatch(event)
      await events.settle()
      expect(events.registry.forArticle(ARTICLE)).toEqual([])
    }
  })
})
