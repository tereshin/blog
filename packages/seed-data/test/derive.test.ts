import { describe, expect, it } from 'vitest'
import { derive } from '../src/derive.ts'
import { buildDataset } from '../src/index.ts'
import type { SeedArticle, SeedComment, SeedReaction, SeedUser } from '../src/types.ts'

const anchor = new Date('2026-10-08T00:00:00Z')
const date = (offset_hours: number) => new Date(anchor.getTime() + offset_hours * 3_600_000)

const user = (id: string, created_at = date(-24)): SeedUser => ({
  key: id, id, public_number: 1, sub: id, email: `${id}@test`, display_name: id, role: 'member', can_publish: true,
  restricted_at: null, created_at, avatar_url: '',
})
const article = (id: string, author_id: string, status: SeedArticle['status'] = 'published'): SeedArticle => ({
  key: id, id, author_id, topic_id: 't', title: id, slug: id, blocks: { time: 0, blocks: [], version: '' }, visibility: 'public',
  comments_enabled: true, status, published_at: date(-1), created_at: date(-2), updated_at: date(-1), excerpt: '', first_image_url: null, search_text: '',
})
const comment = (id: string, article_id: string, author_id: string, extra: Partial<SeedComment> = {}): SeedComment => ({
  key: id, id, article_id, author_id, parent_id: null, body: id, status: 'visible', edited_at: null, created_at: date(-1), ...extra,
})
const reaction = (user_id: string, target_type: 'article' | 'comment', target_id: string, kind: SeedReaction['kind'] = 'heart'): SeedReaction => ({
  user_id, target_type, target_id, kind, created_at: date(-1),
})

const base = { users: [user('a'), user('b'), user('c')], views: [], bookmarks: [] }

describe('seed-data: производные значения', () => {
  it('счётчики статьи равны числу строк', () => {
    const result = derive(
      {
        ...base,
        articles: [article('p', 'a')],
        comments: [],
        reactions: [reaction('b', 'article', 'p', 'fire'), reaction('c', 'article', 'p', 'heart')],
        views: [{ article_id: 'p', viewer_key: 'user:b', counted_at: date(0) }, { article_id: 'p', viewer_key: 'guest:1', counted_at: date(0) }],
        bookmarks: [{ user_id: 'b', article_id: 'p', created_at: date(0) }],
      },
      anchor,
    )
    expect(result.articles.get('p')).toMatchObject({ reaction_counts: { laugh: 0, heart: 1, thumb: 0, fire: 1 }, reaction_count: 2, view_count: 2, bookmark_count: 1 })
  })

  it('удалённый комментарий без ответов не занимает место, а с видимым ответом — занимает заглушкой', () => {
    const result = derive(
      {
        ...base,
        articles: [article('p', 'a')],
        comments: [
          comment('visible', 'p', 'b'),
          comment('gone_alone', 'p', 'b', { status: 'deleted', body: '' }),
          comment('gone_with_reply', 'p', 'b', { status: 'deleted', body: '' }),
          comment('reply', 'p', 'c', { parent_id: 'gone_with_reply' }),
          comment('hidden_with_hidden_reply', 'p', 'b', { status: 'hidden', body: '' }),
          comment('hidden_reply', 'p', 'c', { parent_id: 'hidden_with_hidden_reply', status: 'hidden' }),
        ],
        reactions: [],
      },
      anchor,
    )
    // visible + заглушка с видимым ответом + сам ответ
    expect(result.articles.get('p')?.comment_count).toBe(3)
  })

  it('reply_count считает только видимые ответы; reaction_count комментария — строки реакций', () => {
    const result = derive(
      {
        ...base,
        articles: [article('p', 'a')],
        comments: [comment('root', 'p', 'b'), comment('r1', 'p', 'c', { parent_id: 'root' }), comment('r2', 'p', 'c', { parent_id: 'root', status: 'deleted' })],
        reactions: [reaction('a', 'comment', 'root'), reaction('c', 'comment', 'root', 'fire')],
      },
      anchor,
    )
    expect(result.comments.get('root')).toEqual({ reaction_count: 2, reply_count: 1 })
  })

  it('top_comment — видимый комментарий с наибольшим числом ответов и реакций; скрытый не выбирается', () => {
    const result = derive(
      {
        ...base,
        articles: [article('p', 'a')],
        comments: [
          comment('quiet', 'p', 'b'),
          comment('busy', 'p', 'b', { created_at: date(-0.5) }),
          comment('answer', 'p', 'c', { parent_id: 'busy' }),
          comment('hidden_star', 'p', 'b', { status: 'hidden', body: '' }),
        ],
        reactions: [reaction('a', 'comment', 'hidden_star'), reaction('b', 'comment', 'hidden_star', 'fire'), reaction('c', 'comment', 'hidden_star', 'laugh')],
      },
      anchor,
    )
    expect(result.articles.get('p')?.top_comment?.id).toBe('busy')
  })

  it('репутация: реакции на опубликованные статьи и видимые комментарии; скрытые, удалённые, черновики не в счёт', () => {
    const result = derive(
      {
        ...base,
        articles: [article('p', 'a'), article('draft', 'a', 'draft'), article('hid', 'a', 'hidden'), article('del', 'a', 'deleted')],
        comments: [comment('ok', 'p', 'a'), comment('hid_c', 'p', 'a', { status: 'hidden', body: '' })],
        reactions: [
          reaction('b', 'article', 'p'), reaction('c', 'article', 'p'),
          reaction('b', 'article', 'draft'), reaction('b', 'article', 'hid'), reaction('b', 'article', 'del'),
          reaction('b', 'comment', 'ok'), reaction('b', 'comment', 'hid_c'),
        ],
      },
      anchor,
    )
    expect(result.reputation.get('a')).toBe(3)
    expect(result.reputation.get('b')).toBe(0)
  })

  it('знаки: первый пост, 10 реакций, год на площадке', () => {
    const reactions = Array.from({ length: 10 }, (_, index) => reaction(`r${index}`, 'article', 'p'))
    const result = derive(
      { ...base, users: [user('a', date(-24 * 400)), user('b'), user('c')], articles: [article('p', 'a')], comments: [], reactions },
      anchor,
    )
    expect(result.badges.get('a')).toEqual({ first_post: true, ten_reactions: true, one_year: true })
    expect(result.badges.get('b')).toEqual({ first_post: false, ten_reactions: false, one_year: false })
  })
})

describe('seed-data: производные значения малого набора', () => {
  const data = buildDataset('small', anchor)
  const by = Object.fromEntries(data.users.map((item) => [item.key, item]))

  it('все три знака есть у разных участников, у newcomer репутация 0', () => {
    const badge = (key: string) => data.derived.badges.get(by[key]?.id ?? '')
    expect(badge('author_a')).toMatchObject({ first_post: true, one_year: true })
    expect(badge('author_b')).toMatchObject({ first_post: true, ten_reactions: true })
    expect(data.derived.reputation.get(by.newcomer?.id ?? '')).toBe(0)
    expect(badge('newcomer')).toEqual({ first_post: false, ten_reactions: false, one_year: false })
  })

  it('у каждой статьи есть запись производных, а репутация не отрицательна', () => {
    expect(data.derived.articles.size).toBe(data.articles.length)
    for (const value of data.derived.reputation.values()) expect(value).toBeGreaterThanOrEqual(0)
  })
})
