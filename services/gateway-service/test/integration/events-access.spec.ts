import { describe, expect, it } from 'vitest'
import type { ServiceContext } from '@blog/contracts'
import { createLogger } from '@blog/logger'
import { EventsService } from '../../src/modules/events/events.service.ts'
import type { ArticleAccess, Connection, EventFrame } from '../../src/modules/events/events.types.ts'

const ARTICLE = '00000000-0000-4000-8000-000000000001'
const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const OTHER = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99'
const COMMENT = '10000000-0000-4000-8000-000000000001'
const OCCURRED_AT = '2026-10-09T08:00:00.000Z'

function member(user_id: string): ServiceContext {
  return { user_id, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${user_id}` }
}

function open(viewer: ServiceContext, jwt: string): { connection: Connection; frames: EventFrame[] } {
  const frames: EventFrame[] = []
  const connection: Connection = {
    id: crypto.randomUUID(),
    viewer,
    viewer_jwt: jwt,
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

describe('поток: смена видимости снимает статью у тех, кто её больше не читает', () => {
  it('кадр уходит всем открывшим, следующие кадры — только тем, кому доступ остался', async () => {
    const readable = new Map<string, boolean>([
      ['guest-jwt', false],
      ['member-jwt', true],
    ])
    const events = new EventsService(async (jwt): Promise<ArticleAccess> => {
      return { can_read: readable.get(jwt) === true, visibility: 'members', status: 'published', author_id: AUTHOR }
    }, createLogger({ service: 'gateway-test', level: 'silent' }))

    const guest = open({ role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' }, 'guest-jwt')
    const reader = open(member(OTHER), 'member-jwt')
    for (const item of [guest, reader]) {
      events.registry.add(item.connection)
      events.registry.replace(item.connection, { article_ids: [ARTICLE], conversation_ids: [], feed_key: null, notifications: false })
    }

    const updated = events.dispatch({
      name: 'content.article.updated',
      occurred_at: OCCURRED_AT,
      article_id: ARTICLE,
      author_id: AUTHOR,
      visibility: 'members',
      status: 'published',
    })
    expect(updated).toBe(2)
    await events.settle()

    expect(guest.frames.map((frame) => frame.type)).toEqual(['article'])
    expect(events.registry.forArticle(ARTICLE).map((connection) => connection.id)).toEqual([reader.connection.id])

    events.dispatch({
      name: 'discussion.comment.created',
      occurred_at: OCCURRED_AT,
      article_id: ARTICLE,
      comment_id: COMMENT,
    })
    expect(guest.frames).toHaveLength(1)
    expect(reader.frames.map((frame) => frame.type)).toEqual(['article', 'comment'])
  })
})
