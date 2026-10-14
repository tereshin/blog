import { describe, expect, it } from 'vitest'
import { toPopularComment } from '@/entities/comment'

describe('маппер популярного комментария', () => {
  it('комментарий получает ссылку на статью у комментария', () => {
    const model = toPopularComment({
      id: 'c1',
      author_name: 'Борис',
      author_avatar_url: null,
      article_id: 'a1',
      article_title: 'Заголовок',
      article_slug: 'zagolovok',
      excerpt: 'Текст',
      reaction_count: 3,
      reaction_counts: { laugh: 0, heart: 2, thumb: 1, fire: 0 },
    })
    expect(model.href).toBe('/p/zagolovok#comment-c1')
    expect(model.reaction_counts).toEqual({ laugh: 0, heart: 2, thumb: 1, fire: 0 })
  })
})
