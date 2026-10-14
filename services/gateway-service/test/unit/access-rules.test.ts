import { describe, expect, it } from 'vitest'
import { frameTypeOf, toFrame } from '../../src/modules/events/index.ts'

const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const OTHER = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99'

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
