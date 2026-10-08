import { describe, expect, it } from 'vitest'
import { getHighlightedItem, getSectionFromPath } from '@/widgets/shell'

const topics = [
  { id: 't1', slug: 'tehnologii' },
  { id: 't2', slug: 'dizajn' },
]

function section(pathname: string, article_topic_id: string | null = null) {
  return getSectionFromPath({ pathname, topics, article_topic_id })
}

describe('getSectionFromPath', () => {
  it.each([
    ['/', { kind: 'fresh' }],
    ['/popular', { kind: 'popular' }],
    ['/feed', { kind: 'my_feed' }],
    ['/messages', { kind: 'messages' }],
    ['/rating', { kind: 'rating' }],
    ['/u/anna', { kind: 'profile' }],
    ['/u/anna/followers', { kind: 'followers' }],
    ['/u/anna/following', { kind: 'following' }],
    ['/bookmarks', { kind: 'bookmarks' }],
    ['/search', { kind: 'search' }],
    ['/write', { kind: 'write' }],
    ['/write/123', { kind: 'write_edit' }],
    ['/admin/moderation', { kind: 'admin_moderation' }],
    ['/admin/topics', { kind: 'admin_topics' }],
    ['/admin/settings', { kind: 'admin_settings' }],
    ['/about', { kind: 'about' }],
    ['/что-то-неизвестное', { kind: 'about' }],
  ])('%s', (pathname, expected) => {
    expect(section(pathname)).toEqual(expected)
  })

  it('тема находится по адресу; неизвестная тема даёт topic_id = null', () => {
    expect(section('/t/dizajn')).toEqual({ kind: 'topic', topic_id: 't2' })
    expect(section('/t/net-takoj')).toEqual({ kind: 'topic', topic_id: null })
  })

  it('статья берёт тему из загруженной статьи', () => {
    expect(section('/p/statya', 't1')).toEqual({ kind: 'article', topic_id: 't1' })
    expect(section('/p/statya')).toEqual({ kind: 'article', topic_id: null })
  })

  it('вместе с подсветкой: профиль никого не выделяет, тема выделяет себя', () => {
    expect(getHighlightedItem(section('/u/anna'), ['t1', 't2'])).toBeNull()
    expect(getHighlightedItem(section('/t/dizajn'), ['t1', 't2'])).toEqual({ kind: 'topic', topic_id: 't2' })
    expect(getHighlightedItem(section('/t/dizajn'), ['t1'])).toBeNull()
  })
})
