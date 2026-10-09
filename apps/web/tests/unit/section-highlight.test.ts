import { describe, expect, it } from 'vitest'
import { getHighlightedItem } from '@/widgets/shell'
import type { SectionView } from '@/widgets/shell'

const ACTIVE = ['t1', 't2']

// Таблица `contracts/sections.md`: 18 разделов и что подсвечено на каждом.
const CASES: Array<[string, SectionView, ReturnType<typeof getHighlightedItem>]> = [
  ['Свежее /', { kind: 'fresh' }, { kind: 'fresh' }],
  ['Популярное /popular', { kind: 'popular' }, { kind: 'popular' }],
  ['Моя лента /feed', { kind: 'my_feed' }, { kind: 'mine' }],
  ['Тема /t/{slug}', { kind: 'topic', topic_id: 't1' }, { kind: 'topic', topic_id: 't1' }],
  ['Статья /p/{slug}', { kind: 'article', topic_id: 't2' }, { kind: 'topic', topic_id: 't2' }],
  ['Профиль /u/{slug}', { kind: 'profile' }, null],
  ['Подписчики', { kind: 'followers' }, null],
  ['Подписки', { kind: 'following' }, null],
  ['Сообщения /messages', { kind: 'messages' }, { kind: 'messages' }],
  ['Рейтинг /rating', { kind: 'rating' }, { kind: 'rating' }],
  ['Закладки', { kind: 'bookmarks' }, null],
  ['Поиск', { kind: 'search' }, null],
  ['О проекте', { kind: 'about' }, null],
  ['Новый редактор', { kind: 'write' }, null],
  ['Правка', { kind: 'write_edit' }, null],
  ['Модерация', { kind: 'admin_moderation' }, null],
  ['Темы площадки', { kind: 'admin_topics' }, null],
  ['Настройки площадки', { kind: 'admin_settings' }, null],
]

describe('getHighlightedItem', () => {
  it('покрывает все 18 разделов контракта', () => {
    expect(CASES).toHaveLength(18)
    expect(new Set(CASES.map(([, section]) => section.kind)).size).toBe(18)
  })

  it.each(CASES)('%s', (_name, section, expected) => {
    expect(getHighlightedItem(section, ACTIVE)).toEqual(expected)
  })

  it('статья с архивной темой никого не подсвечивает', () => {
    expect(getHighlightedItem({ kind: 'article', topic_id: 'archived' }, ACTIVE)).toBeNull()
  })

  it('прямой адрес профиля после ленты никого не подсвечивает', () => {
    expect(getHighlightedItem({ kind: 'fresh' }, ACTIVE)).toEqual({ kind: 'fresh' })
    expect(getHighlightedItem({ kind: 'profile' }, ACTIVE)).toBeNull()
  })

  it('статья без темы и неизвестная тема никого не подсвечивают', () => {
    expect(getHighlightedItem({ kind: 'article', topic_id: null }, ACTIVE)).toBeNull()
    expect(getHighlightedItem({ kind: 'topic', topic_id: 'unknown' }, ACTIVE)).toBeNull()
  })

  it('пока список тем пуст, тема не подсвечена', () => {
    expect(getHighlightedItem({ kind: 'topic', topic_id: 't1' }, [])).toBeNull()
  })
})
