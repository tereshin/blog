import { describe, expect, it } from 'vitest'
import { syncFeedCards } from '@/entities/article'
import type { ArticleCardModel } from '@/entities/article'

function card(id: string, title: string): ArticleCardModel {
  return {
    id,
    slug: id,
    title,
    excerpt: '',
    first_image_url: null,
    published_at: '2026-10-01T00:00:00.000Z',
    time_label: '00:00',
    author: { user_id: 'u', display_name: 'Анна', avatar_url: null, slug: 'anna', href: '/u/anna' },
    topic: { id: 't', title: 'Технологии', slug: 'tech', status: 'active', href: '/t/tech' },
    reaction_counts: { laugh: 0, heart: 0, thumb: 0, fire: 0 },
    reaction_count: 0,
    comment_count: 0,
    bookmark_count: 0,
    view_count: 0,
    top_comment: null,
    visibility: 'public',
    comments_enabled: true,
    href: `/p/${id}`,
  }
}

describe('syncFeedCards', () => {
  it('убирает запрошенную карточку, которой больше нет, и обновляет вернувшуюся', () => {
    const stay = card('stay', 'Остаётся')
    const gone = card('gone', 'Была видна')
    const fresh = card('fresh', 'Обновлённая')
    const data = { pages: [{ items: [stay, gone, fresh], next_cursor: null }], pageParams: [undefined] }
    const next = syncFeedCards(data, new Set(['gone', 'fresh']), new Map([['fresh', { ...fresh, title: 'Новый заголовок' }]]))
    const titles = (next as { pages: { items: { title: string }[] }[] }).pages[0]?.items.map((item) => item.title)
    expect(titles).toEqual(['Остаётся', 'Новый заголовок'])
  })
})
