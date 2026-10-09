import { describe, expect, it } from 'vitest'
import type { ServiceContext } from '@blog/contracts'
import { createLogger } from '@blog/logger'
import { EventsService } from '../../src/modules/events/events.service.ts'
import type { Connection, EventFrame } from '../../src/modules/events/events.types.ts'

const ARTICLE = '00000000-0000-4000-8000-000000000001'
const OCCURRED_AT = '2026-10-09T08:00:00.000Z'

function open(viewer: ServiceContext): { connection: Connection; frames: EventFrame[] } {
  const frames: EventFrame[] = []
  const connection: Connection = {
    id: crypto.randomUUID(),
    viewer,
    viewer_jwt: null,
    article_ids: new Set(),
    conversation_ids: new Set(),
    feed_key: null,
    notifications: false,
    write: (frame) => {
      frames.push(frame)
      return true
    },
    close: () => {},
  }
  return { connection, frames }
}

describe('кадр настроек', () => {
  it('content.settings.updated уходит каждому соединению и не несёт статью', () => {
    const events = new EventsService(async () => null, createLogger({ service: 'gateway-test', level: 'silent' }))
    const guest = open({ role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' })
    const reader = open({
      user_id: '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99',
      role: 'member',
      is_restricted: false,
      can_publish: true,
      viewer_key: 'user:9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99',
    })
    events.registry.add(guest.connection)
    events.registry.add(reader.connection)
    events.registry.replace(reader.connection, { article_ids: [ARTICLE], conversation_ids: [], feed_key: null, notifications: false })

    const delivered = events.dispatch({
      name: 'content.settings.updated',
      occurred_at: OCCURRED_AT,
      site_name: 'Блог',
    })

    expect(delivered).toBe(2)
    expect(guest.frames).toEqual([{ type: 'settings', occurred_at: OCCURRED_AT }])
    expect(reader.frames).toEqual([{ type: 'settings', occurred_at: OCCURRED_AT }])
  })
})
