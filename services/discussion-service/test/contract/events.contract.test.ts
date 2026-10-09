import { readFileSync } from 'node:fs'
import { CommentCreatedV1 } from '@blog/contracts'
import { describe, expect, it } from 'vitest'
import { commentCreatedEvent } from '../../src/modules/comment/comment.events.ts'

const fixture = new URL('../../../../packages/contracts/test/fixtures/discussion/comment-created.json', import.meta.url)

const snapshot = {
  article_id: '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22',
  reaction_counts: { laugh: 0, heart: 0, thumb: 0, fire: 0 },
  reaction_count: 0,
  comment_count: 1,
  view_count: 0,
  bookmark_count: 0,
  top_comment: null,
}

describe('discussion: контракт событий', () => {
  it('производитель сериализует создание комментария', () => {
    const event = commentCreatedEvent({
      correlation_id: 'c-1',
      occurred_at: '2026-10-08T12:00:00.000Z',
      snapshot,
      comment_id: '4a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a31',
      author_id: '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99',
      parent_id: null,
      parent_author_id: null,
      article_author_id: '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a11',
      excerpt: 'Короткий текст комментария',
    })
    expect(CommentCreatedV1.parse(event).excerpt).toBe('Короткий текст комментария')
  })

  it('потребитель разбирает фикстуру контракта', () => {
    const raw: unknown = JSON.parse(readFileSync(fixture, 'utf8'))
    expect(CommentCreatedV1.parse(raw).comment_id).toBe('4a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a31')
  })
})
