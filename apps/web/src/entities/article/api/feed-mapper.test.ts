import { describe, expect, it } from 'vitest'
import { buildFeedFixture } from '@/shared/api/mocks/fixtures/feed.ts'
import { feedPageDtoSchema, toFeedPage } from '@/entities/article'

describe('маппер ленты', () => {
  const now = new Date(2026, 9, 8, 15, 30)

  it('превращает ответ сервера в модель карточки с адресами и подписью времени', () => {
    const [dto] = buildFeedFixture(1, now)
    if (!dto) throw new Error('Missing feed fixture')
    const with_avatar = {
      ...dto,
      author: { ...dto.author, status_icon_id: '44444444-4444-4444-8444-444444444444' },
      topic: { ...dto.topic, avatar_url: 'https://example.com/topic.png' },
    }
    const page = toFeedPage(feedPageDtoSchema.parse({ items: [with_avatar], next_cursor: '20' }), now)
    const card = page.items[0]
    expect(page.next_cursor).toBe('20')
    expect(card).toMatchObject({
      href: '/p/statya-1',
      author: { href: '/u/anna', status_icon_id: '44444444-4444-4444-8444-444444444444' },
      topic: { href: '/t/tehnologii', avatar_url: 'https://example.com/topic.png' },
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
