import { describe, expect, it } from 'vitest'
import type { ServiceContext } from '@blog/contracts'
import { canReadFields, frameTypeOf, toFrame } from '../../src/modules/events/index.ts'

const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const OTHER = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99'

const guest: ServiceContext = { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' }
const member = (user_id: string): ServiceContext => ({ user_id, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${user_id}` })
const admin: ServiceContext = { user_id: OTHER, role: 'admin', is_restricted: false, can_publish: true, viewer_key: `user:${OTHER}` }

describe('canReadFields', () => {
  it('public читают все, members — только вошедшие', () => {
    expect(canReadFields(guest, { status: 'published', visibility: 'public', author_id: AUTHOR })).toBe(true)
    expect(canReadFields(guest, { status: 'published', visibility: 'members', author_id: AUTHOR })).toBe(false)
    expect(canReadFields(member(OTHER), { status: 'published', visibility: 'members', author_id: AUTHOR })).toBe(true)
  })

  it('author — автор и администратор', () => {
    const fields = { status: 'published', visibility: 'author', author_id: AUTHOR } as const
    expect(canReadFields(member(AUTHOR), fields)).toBe(true)
    expect(canReadFields(member(OTHER), fields)).toBe(false)
    expect(canReadFields(admin, fields)).toBe(true)
  })

  it('черновик — только автор, скрытая — автор и администратор, удалённая — никто', () => {
    expect(canReadFields(member(AUTHOR), { status: 'draft', visibility: 'public', author_id: AUTHOR })).toBe(true)
    expect(canReadFields(admin, { status: 'draft', visibility: 'public', author_id: AUTHOR })).toBe(false)
    expect(canReadFields(admin, { status: 'hidden', visibility: 'public', author_id: AUTHOR })).toBe(true)
    expect(canReadFields(guest, { status: 'hidden', visibility: 'public', author_id: AUTHOR })).toBe(false)
    expect(canReadFields(admin, { status: 'deleted', visibility: 'public', author_id: AUTHOR })).toBe(false)
  })
})

describe('кадры', () => {
  it('тип кадра по имени события', () => {
    expect(frameTypeOf('content.article.updated')).toBe('article')
    expect(frameTypeOf('content.settings.updated')).toBe('settings')
    expect(frameTypeOf('discussion.comment.created')).toBe('comment')
    expect(frameTypeOf('messaging.message.sent')).toBe('message')
    expect(frameTypeOf('identity.user.created')).toBeNull()
  })

  it('кадр несёт только идентификаторы и время, без текста', () => {
    const frame = toFrame('comment', {
      name: 'discussion.comment.created',
      occurred_at: '2026-10-08T12:00:00.000Z',
      article_id: AUTHOR,
      comment_id: OTHER,
      body: 'секретный текст',
    })
    expect(frame).toEqual({ type: 'comment', article_id: AUTHOR, comment_id: OTHER, occurred_at: '2026-10-08T12:00:00.000Z' })
  })
})
