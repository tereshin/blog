import { describe, expect, it } from 'vitest'
import { buildFeedFixture } from '@/shared/api/mocks/fixtures/feed.ts'
import { feedPageDtoSchema, toFeedPage } from '@/entities/article'
import { toPopularComment } from '@/entities/comment'
import { toTopic, topicHue } from '@/entities/topic'

describe('маппер ленты', () => {
  const now = new Date(2026, 9, 8, 15, 30)

  it('превращает ответ сервера в модель карточки с адресами и подписью времени', () => {
    const [dto] = buildFeedFixture(1, now)
    const page = toFeedPage(feedPageDtoSchema.parse({ items: [dto], next_cursor: '20' }), now)
    const card = page.items[0]
    expect(page.next_cursor).toBe('20')
    expect(card).toMatchObject({
      href: '/p/statya-1',
      author: { href: '/u/anna' },
      topic: { href: '/t/tehnologii' },
    })
    expect(card?.time_label).toMatch(/^\d{2}:\d{2}$/)
  })

  it('старая статья подписывается датой', () => {
    const [dto] = buildFeedFixture(1, new Date(2026, 8, 1))
    const card = toFeedPage(feedPageDtoSchema.parse({ items: [dto], next_cursor: null }), now).items[0]
    expect(card?.time_label).toMatch(/^\d{2}\.\d{2}\.\d{4}$/)
  })

  it('отвергает ответ не по схеме', () => {
    expect(() => feedPageDtoSchema.parse({ items: [{ id: 1 }], next_cursor: null })).toThrow()
  })
})

describe('остальные мапперы', () => {
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

  it('тема заполняет необязательные поля и даёт устойчивый оттенок', () => {
    const topic = toTopic({ id: 't1', title: 'Наука', slug: 'nauka', status: 'active', position: 1 })
    expect(topic).toMatchObject({ description: '', avatar_url: null, cover_url: null })
    expect(topicHue('t1')).toBe(topicHue('t1'))
    expect(topicHue('t1')).toBeGreaterThanOrEqual(0)
    expect(topicHue('t1')).toBeLessThan(360)
  })
})
