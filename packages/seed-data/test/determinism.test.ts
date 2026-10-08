import { describe, expect, it } from 'vitest'
import { buildDataset } from '../src/index.ts'
import type { Dataset } from '../src/index.ts'

const anchor = new Date('2026-10-08T00:00:00Z')

/** Дата-набор в сравнимом виде: Map превращаются в массивы, остальное — как есть. */
function plain(data: Dataset): unknown {
  return JSON.parse(
    JSON.stringify(data, (_key, value: unknown) => (value instanceof Map ? [...value.entries()] : value)),
  )
}

describe('seed-data: детерминированность', () => {
  it.each(['small', 'large'] as const)('два вызова %s с одним якорем дают одинаковый результат', (profile) => {
    expect(plain(buildDataset(profile, anchor))).toEqual(plain(buildDataset(profile, anchor)))
  })

  it('смена якоря сдвигает время, но не идентификаторы и состав', () => {
    const first = buildDataset('small', anchor)
    const second = buildDataset('small', new Date('2027-03-01T00:00:00Z'))
    expect(second.articles.map((a) => a.id)).toEqual(first.articles.map((a) => a.id))
    expect(second.comments.map((c) => c.id)).toEqual(first.comments.map((c) => c.id))
    expect(second.articles[0]?.published_at?.getTime()).not.toBe(first.articles[0]?.published_at?.getTime())
    expect(second.derived.reputation).toEqual(first.derived.reputation)
  })

  it('ни одна дата не зависит от текущего времени: все они не позже якоря', () => {
    const data = buildDataset('large', anchor)
    const dates = [
      ...data.articles.flatMap((a) => [a.created_at, a.updated_at, a.published_at]),
      ...data.comments.map((c) => c.created_at),
      ...data.reactions.map((r) => r.created_at),
      ...data.users.map((u) => u.created_at),
    ].filter((value): value is Date => value instanceof Date)
    expect(Math.max(...dates.map((date) => date.getTime()))).toBeLessThanOrEqual(anchor.getTime())
  })

  it('идентификаторы в каждой коллекции уникальны', () => {
    const data = buildDataset('large', anchor)
    for (const [name, ids] of Object.entries({
      users: data.users.map((u) => u.id),
      articles: data.articles.map((a) => a.id),
      comments: data.comments.map((c) => c.id),
      topics: data.topics.map((t) => t.id),
      notifications: data.notifications.map((n) => n.id),
      messages: data.messages.map((m) => m.id),
      slugs: data.slugs.map((s) => s.slug),
    })) {
      expect(new Set(ids).size, name).toBe(ids.length)
    }
  })

  it('все ссылки между записями ведут на существующие записи', () => {
    const data = buildDataset('large', anchor)
    const users = new Set(data.users.map((u) => u.id))
    const articles = new Set(data.articles.map((a) => a.id))
    const comments = new Set(data.comments.map((c) => c.id))
    const topics = new Set(data.topics.map((t) => t.id))
    expect(data.articles.every((a) => users.has(a.author_id) && topics.has(a.topic_id))).toBe(true)
    expect(data.comments.every((c) => articles.has(c.article_id) && users.has(c.author_id) && (c.parent_id === null || comments.has(c.parent_id)))).toBe(true)
    expect(data.reactions.every((r) => users.has(r.user_id) && (r.target_type === 'article' ? articles : comments).has(r.target_id))).toBe(true)
    expect(data.bookmarks.every((b) => users.has(b.user_id) && articles.has(b.article_id))).toBe(true)
    expect(data.follows.every((f) => users.has(f.follower_id) && (f.target_type === 'user' ? users : topics).has(f.target_id) && f.follower_id !== f.target_id)).toBe(true)
    expect(data.promotions.every((p) => articles.has(p.article_id))).toBe(true)
    expect(data.reports.every((r) => articles.has(r.article_id) && users.has(r.reporter_id))).toBe(true)
    expect(data.notifications.every((n) => users.has(n.user_id))).toBe(true)
    expect(data.messages.every((m) => users.has(m.sender_id))).toBe(true)
  })

  it('короткий адрес любой записи начинается с seed-', () => {
    const data = buildDataset('large', anchor)
    expect(data.slugs.every((s) => s.slug.startsWith('seed-'))).toBe(true)
  })
})
