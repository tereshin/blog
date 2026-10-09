import { describe, expect, it } from 'vitest'
import type { ServiceContext } from '@blog/contracts'
import { decodeCursor, encodeCursor } from '../../src/modules/feed/feed.cursor.ts'
import { comparePopular, isPopularCandidate, popularScore } from '../../src/modules/feed/feed.rules.ts'
import type { PopularityInput } from '../../src/modules/feed/feed.rules.ts'
import { createFeedService } from '../../src/modules/feed/feed.service.ts'
import type { FeedRepository, FeedRow } from '../../src/modules/feed/feed.types.ts'

const NOW = new Date('2026-10-08T12:00:00Z')
const DAY = 24 * 60 * 60 * 1000
const viewer: ServiceContext = { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' }

function popular(id: string, partial: Partial<PopularityInput> = {}): PopularityInput {
  return { id, published_at: new Date(NOW.getTime() - DAY), promoted_until: null, reaction_count: 0, comment_count: 0, ...partial }
}

describe('«Популярное»: отбор', () => {
  it('входит статья младше 7 суток', () => {
    expect(isPopularCandidate(popular('a', { published_at: new Date(NOW.getTime() - 6 * DAY) }), NOW)).toBe(true)
  })

  it('граница ровно 7 суток входит, старше — нет', () => {
    expect(isPopularCandidate(popular('a', { published_at: new Date(NOW.getTime() - 7 * DAY) }), NOW)).toBe(true)
    expect(isPopularCandidate(popular('a', { published_at: new Date(NOW.getTime() - 7 * DAY - 1) }), NOW)).toBe(false)
  })

  it('старая статья с действующим продвижением входит, с истёкшим — нет', () => {
    const old = new Date(NOW.getTime() - 30 * DAY)
    expect(isPopularCandidate({ published_at: old, promoted_until: new Date(NOW.getTime() + DAY) }, NOW)).toBe(true)
    expect(isPopularCandidate({ published_at: old, promoted_until: new Date(NOW.getTime() - 1) }, NOW)).toBe(false)
    expect(isPopularCandidate({ published_at: old, promoted_until: NOW }, NOW)).toBe(false)
  })

  it('без даты публикации и продвижения — не входит', () => {
    expect(isPopularCandidate({ published_at: null, promoted_until: null }, NOW)).toBe(false)
  })
})

describe('«Популярное»: порядок', () => {
  it('счёт — реакции плюс комментарии, по убыванию', () => {
    const items = [popular('a', { reaction_count: 1, comment_count: 1 }), popular('b', { reaction_count: 5 }), popular('c', { comment_count: 3 })]
    expect(popularScore(items[0] as PopularityInput)).toBe(2)
    expect([...items].sort(comparePopular).map((item) => item.id)).toEqual(['b', 'c', 'a'])
  })

  it('при равном счёте порядок по id по убыванию, и он устойчив', () => {
    const items = [popular('a', { reaction_count: 2 }), popular('c', { reaction_count: 2 }), popular('b', { reaction_count: 2 })]
    expect([...items].sort(comparePopular).map((item) => item.id)).toEqual(['c', 'b', 'a'])
    expect([...items].reverse().sort(comparePopular).map((item) => item.id)).toEqual(['c', 'b', 'a'])
  })
})

describe('курсор', () => {
  it('кодируется и читается обратно', () => {
    const cursor = { k: 'score', s: 7, id: '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22' } as const
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor)
  })

  it('мусор отвергается как ошибка проверки', () => {
    expect(() => decodeCursor('не-курсор')).toThrow(/Курсор/)
    expect(() => decodeCursor(Buffer.from('{"k":"time"}').toString('base64url'))).toThrow(/Курсор/)
  })
})

function row(index: number, partial: Partial<FeedRow> = {}): FeedRow {
  const id = `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`
  return {
    id,
    slug: `a-${index}`,
    title: `Статья ${index}`,
    excerpt: 'Текст',
    first_image_url: null,
    published_at: new Date(NOW.getTime() - index * 60_000),
    author_id: '11111111-1111-4111-8111-111111111111',
    author_display_name: 'Анна',
    author_avatar_url: null,
    author_slug: null,
    author_public_number: 3,
    topic_id: '22222222-2222-4222-8222-222222222222',
    topic_title: 'Тема',
    topic_slug: 'tema',
    topic_status: 'active',
    reaction_counts: { laugh: 1, heart: 0, thumb: 0, fire: 0 },
    reaction_count: 1,
    comment_count: 0,
    bookmark_count: 0,
    view_count: 0,
    top_comment: null,
    visibility: 'public',
    comments_enabled: true,
    ...partial,
  }
}

function repositoryOf(
  rows: FeedRow[],
  profiles = new Map<string, { display_name: string; avatar_url: string | null }>(),
  follows: { user_ids: string[]; topic_ids: string[] } = { user_ids: [], topic_ids: [] },
): FeedRepository {
  return {
    findPage: async ({ limit }) => rows.slice(0, limit),
    findProfiles: async () => profiles,
    listFollows: async () => follows,
  }
}

describe('feed.service', () => {
  it('отдаёт порцию и next_cursor, если есть ещё', async () => {
    const service = createFeedService(repositoryOf(Array.from({ length: 21 }, (_, index) => row(index + 1))))
    const page = await service.getPage(viewer, { mode: 'fresh', limit: 20 }, NOW)
    expect(page.items).toHaveLength(20)
    expect(page.next_cursor).not.toBeNull()
    expect(decodeCursor(page.next_cursor ?? '')).toMatchObject({ k: 'time', id: page.items[19]?.id })
  })

  it('на последней порции next_cursor пустой', async () => {
    const service = createFeedService(repositoryOf([row(1), row(2)]))
    const page = await service.getPage(viewer, { mode: 'fresh', limit: 20 }, NOW)
    expect(page).toMatchObject({ items: [{ id: row(1).id }, { id: row(2).id }], next_cursor: null })
  })

  it('адрес автора без короткого адреса — номер учётной записи', async () => {
    const page = await createFeedService(repositoryOf([row(1)])).getPage(viewer, { mode: 'fresh', limit: 20 }, NOW)
    expect(page.items[0]?.author.slug).toBe('3')
  })

  it('гость на «Моей ленте» получает 401, без подписок — причину без чтения статей', async () => {
    await expect(createFeedService(repositoryOf([])).getPage(viewer, { mode: 'mine', limit: 20 }, NOW)).rejects.toMatchObject({ http_status: 401 })
    let read = false
    const repository = repositoryOf([])
    repository.findPage = async () => {
      read = true
      return []
    }
    const member: ServiceContext = { ...viewer, role: 'member', user_id: '11111111-1111-4111-8111-111111111111' }
    const empty = await createFeedService(repository).getPage(member, { mode: 'mine', limit: 20 }, NOW)
    expect(empty).toEqual({ items: [], next_cursor: null, reason: 'no_follows' })
    expect(read).toBe(false)

    const followed = await createFeedService(repositoryOf([row(1)], new Map(), { user_ids: [member.user_id ?? ''], topic_ids: [] })).getPage(
      member,
      { mode: 'mine', limit: 20 },
      NOW,
    )
    expect(followed.items).toHaveLength(1)
    expect(followed.reason).toBeUndefined()
  })

  it('самый обсуждаемый комментарий собирается из профиля автора', async () => {
    const author = '33333333-3333-4333-8333-333333333333'
    const top = { id: '44444444-4444-4444-8444-444444444444', author_id: author, body: 'Очень  длинный '.repeat(30), reaction_count: 2, reply_count: 0 }
    const profiles = new Map([[author, { display_name: 'Борис', avatar_url: null }]])
    const page = await createFeedService(repositoryOf([row(1, { top_comment: top })], profiles)).getPage(viewer, { mode: 'fresh', limit: 20 }, NOW)
    const card = page.items[0]
    expect(card?.top_comment?.author_name).toBe('Борис')
    expect(card?.top_comment?.excerpt.length).toBeLessThanOrEqual(140)
    expect(card?.top_comment?.excerpt.endsWith('…')).toBe(true)
  })

  it('комментарий без найденного профиля автора не попадает в карточку', async () => {
    const top = { id: '44444444-4444-4444-8444-444444444444', author_id: '33333333-3333-4333-8333-333333333333', body: 'Текст' }
    const page = await createFeedService(repositoryOf([row(1, { top_comment: top })])).getPage(viewer, { mode: 'fresh', limit: 20 }, NOW)
    expect(page.items[0]?.top_comment).toBeNull()
  })
})
