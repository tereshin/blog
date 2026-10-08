import { describe, expect, it } from 'vitest'
import { buildDataset } from '../src/index.ts'

const anchor = new Date('2026-10-08T00:00:00Z')
const small = buildDataset('small', anchor)
const large = buildDataset('large', anchor)

/** Любая запись малого набора есть в большом с тем же содержимым. */
function expectSuperset(name: string, from: readonly { id: string }[], into: readonly { id: string }[]): void {
  const by_id = new Map(into.map((item) => [item.id, item]))
  for (const item of from) expect(by_id.get(item.id), `${name} ${item.id}`).toEqual(item)
}

describe('seed-data: large — надмножество small', () => {
  const collections = [
    ['users', (d: typeof small) => d.users],
    ['articles', (d: typeof small) => d.articles],
    ['comments', (d: typeof small) => d.comments],
    ['topics', (d: typeof small) => d.topics],
    ['notifications', (d: typeof small) => d.notifications],
    ['conversations', (d: typeof small) => d.conversations],
    ['messages', (d: typeof small) => d.messages],
    ['files', (d: typeof small) => d.files],
  ] as const

  it.each(collections)('%s малого набора остаются с теми же id и значениями', (name, select) => {
    expectSuperset(name, select(small), select(large))
  })

  it('реакции, закладки, просмотры, подписки и адреса малого набора не потеряны', () => {
    const key = (r: { user_id: string; target_id: string }) => `${r.user_id}:${r.target_id}`
    const reactions = new Map(large.reactions.map((r) => [key(r), r]))
    for (const reaction of small.reactions) expect(reactions.get(key(reaction))).toEqual(reaction)
    const bookmarks = new Set(large.bookmarks.map((b) => `${b.user_id}:${b.article_id}`))
    for (const bookmark of small.bookmarks) expect(bookmarks.has(`${bookmark.user_id}:${bookmark.article_id}`)).toBe(true)
    const views = new Set(large.views.map((v) => `${v.viewer_key}:${v.article_id}`))
    for (const view of small.views) expect(views.has(`${view.viewer_key}:${view.article_id}`)).toBe(true)
    const slugs = new Set(large.slugs.map((s) => s.slug))
    for (const slug of small.slugs) expect(slugs.has(slug.slug)).toBe(true)
  })

  it('производные значения малого набора не меняются: large только добавляет', () => {
    for (const [id, derived] of small.derived.articles) expect(large.derived.articles.get(id)).toEqual(derived)
    for (const [id, derived] of small.derived.comments) expect(large.derived.comments.get(id)).toEqual(derived)
    for (const [id, reputation] of small.derived.reputation) expect(large.derived.reputation.get(id)).toBe(reputation)
  })

  it('объём: не меньше 500 опубликованных публичных статей по темам и авторам, 3000+ комментариев, около трети — ответы', () => {
    const published = large.articles.filter((a) => a.status === 'published' && a.visibility === 'public')
    expect(published.length).toBeGreaterThanOrEqual(500)
    expect(new Set(published.map((a) => a.topic_id)).size).toBeGreaterThanOrEqual(5)
    expect(new Set(published.map((a) => a.author_id)).size).toBeGreaterThanOrEqual(10)
    expect(large.comments.length).toBeGreaterThanOrEqual(3000)
    const replies = large.comments.filter((c) => c.parent_id !== null).length / large.comments.length
    expect(replies).toBeGreaterThan(0.2)
    expect(replies).toBeLessThan(0.45)
  })

  it('реакции, закладки и просмотры есть в значимой доле', () => {
    const reacted = new Set(large.reactions.filter((r) => r.target_type === 'article').map((r) => r.target_id))
    expect(reacted.size).toBeGreaterThan(150)
    expect(large.bookmarks.length).toBeGreaterThan(20)
    expect(large.views.length).toBeGreaterThan(1000)
  })
})
