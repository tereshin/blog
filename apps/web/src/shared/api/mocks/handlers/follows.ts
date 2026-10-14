import { HttpResponse, http } from 'msw'
import { currentMockAuthor } from './articles-store.ts'
import { restricted, unauthorized } from './action-responses.ts'

const follows_by_actor = new Map<string, Set<string>>()
function readFollows(actor_id: string): Set<string> {
  return follows_by_actor.get(actor_id) ?? new Set()
}

function saveFollows(actor_id: string, follows: Set<string>): void {
  follows_by_actor.set(actor_id, follows)
}
const seen_by_key = new Map<string, string[]>()

export const followHandlers = [
  http.put('*/v1/follows', async ({ request }) => {
    const actor = currentMockAuthor()
    if (!actor) return unauthorized()
    if (actor.is_restricted) return restricted()
    const body: unknown = await request.json()
    const target_type = typeof body === 'object' && body && 'target_type' in body ? String(body.target_type) : ''
    const target_id = typeof body === 'object' && body && 'target_id' in body ? String(body.target_id) : ''
    if (target_type === 'user' && target_id === actor.id) {
      return HttpResponse.json({ code: 'self_follow', title: 'На себя подписаться нельзя', status: 422 }, { status: 422 })
    }
    const follows = readFollows(actor.id)
    follows.add(`${target_type}:${target_id}`)
    saveFollows(actor.id, follows)
    return HttpResponse.json({ target_type, target_id, is_following: true })
  }),

  http.delete('*/v1/follows', async ({ request }) => {
    const actor = currentMockAuthor()
    if (!actor) return unauthorized()
    if (actor.is_restricted) return restricted()
    const body: unknown = await request.json()
    const target_type = typeof body === 'object' && body && 'target_type' in body ? String(body.target_type) : ''
    const target_id = typeof body === 'object' && body && 'target_id' in body ? String(body.target_id) : ''
    const follows = readFollows(actor.id)
    follows.delete(`${target_type}:${target_id}`)
    saveFollows(actor.id, follows)
    return HttpResponse.json({ target_type, target_id, is_following: false })
  }),

  http.get('*/v1/me/follows', ({ request }) => {
    const actor = currentMockAuthor()
    if (!actor) return unauthorized()
    const url = new URL(request.url)
    const follows = readFollows(actor.id)
    const target_type = url.searchParams.get('target_type') ?? 'user'
    const target_ids = url.searchParams.get('target_ids')?.split(',').filter(Boolean) ?? []
    return HttpResponse.json({
      items: target_ids.map((target_id) => ({ target_type, target_id, is_following: follows.has(`${target_type}:${target_id}`) })),
    })
  }),

  http.put('*/v1/feed-seen', async ({ request }) => {
    const body: unknown = await request.json()
    const feed_key = typeof body === 'object' && body && 'feed_key' in body ? String(body.feed_key) : ''
    const article_id = typeof body === 'object' && body && 'article_id' in body ? String(body.article_id) : ''
    const current = seen_by_key.get(feed_key) ?? []
    if (!current.includes(article_id)) current.unshift(article_id)
    seen_by_key.set(feed_key, current.slice(0, 500))
    return HttpResponse.json({ feed_key, article_id })
  }),

  http.get('*/v1/feed-seen', ({ request }) => {
    const feed_key = new URL(request.url).searchParams.get('feed_key') ?? ''
    return HttpResponse.json({ article_ids: seen_by_key.get(feed_key) ?? [] })
  }),
]
