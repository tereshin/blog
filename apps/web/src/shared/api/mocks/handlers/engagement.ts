import { HttpResponse, http } from 'msw'
import { promotedIds } from './engagement-store.ts'
import { mockFeedArticles } from './feed.ts'
import type { FeedCardFixture } from '../fixtures/feed.ts'
import { currentMockAuthor } from './articles-store.ts'
import { patchStoredComment, readStoredComments } from './discussion-store.ts'
import { readMockViewer } from './session.ts'
import { readSite } from './shell.ts'
import { emitLive, restricted, sumCounts, unauthorized } from './action-responses.ts'

const mine = new Map<string, string>()
const bookmarks = new Set<string>()
const bookmark_order: string[] = []

function isKind(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 64
}

function canPlace(kind: string, current: string | null): boolean {
  if (current === kind) return true
  return readSite().settings.reaction_appearances.some((item) => item.status === 'active' && item.kind === kind)
}

function reactionBody(article: FeedCardFixture, my_reaction: string | null) {
  const reaction_count = sumCounts(article.reaction_counts)
  article.reaction_count = reaction_count
  return { reaction_counts: { ...article.reaction_counts }, reaction_count, my_reaction }
}

export const engagementHandlers = [
  http.get('*/v1/me/article-states', ({ request }) => {
    if (readMockViewer() === 'guest') return HttpResponse.json({ states: {} })
    const ids = new URL(request.url).searchParams.get('article_ids')?.split(',').filter(Boolean) ?? []
    const states: Record<string, { my_reaction: string | null; is_bookmarked: boolean }> = {}
    for (const id of ids) states[id] = { my_reaction: mine.get(id) ?? null, is_bookmarked: bookmarks.has(id) }
    return HttpResponse.json({ states })
  }),

  http.post('*/v1/reactions', async ({ request }) => {
    if (readMockViewer() === 'guest') return unauthorized()
    const body: unknown = await request.json()
    const target_id = typeof body === 'object' && body && 'target_id' in body ? String(body.target_id) : ''
    const kind = typeof body === 'object' && body && 'kind' in body ? body.kind : null
    const actor = currentMockAuthor()
    if (actor?.is_restricted) return restricted()
    const comment = readStoredComments().find((item) => item.id === target_id && item.status === 'visible')
    const article = mockFeedArticles.find((item) => item.id === target_id)
    const current = comment && actor ? (comment.reactions[actor.id] ?? null) : article ? (mine.get(article.id) ?? null) : null
    if (!isKind(kind) || !canPlace(kind, current)) {
      return HttpResponse.json({ code: 'validation_failed', title: 'Данные не прошли проверку', status: 422 }, { status: 422 })
    }
    if (comment && actor) {
      const counts = { ...comment.reaction_counts }
      if (current) counts[current] = Math.max(0, (counts[current] ?? 0) - 1)
      const next = current === kind ? null : kind
      if (next) counts[next] = (counts[next] ?? 0) + 1
      const reactions: Record<string, string> = {}
      for (const [id, value] of Object.entries(comment.reactions)) {
        if (id !== actor.id && isKind(value)) reactions[id] = value
      }
      if (next) reactions[actor.id] = next
      const saved = patchStoredComment(comment.id, { reaction_counts: counts, reactions })
      emitLive('reaction', { article_id: comment.article_id })
      return HttpResponse.json({
        reaction_counts: saved?.reaction_counts ?? counts,
        reaction_count: sumCounts(counts),
        my_reaction: next,
      })
    }
    if (!article) return HttpResponse.json({ code: 'validation_failed', title: 'Данные не прошли проверку', status: 422 }, { status: 422 })
    if (current) article.reaction_counts[current] = Math.max(0, (article.reaction_counts[current] ?? 0) - 1)
    const next = current === kind ? null : kind
    if (next) {
      article.reaction_counts[next] = (article.reaction_counts[next] ?? 0) + 1
      mine.set(article.id, next)
    } else mine.delete(article.id)
    return HttpResponse.json(reactionBody(article, next))
  }),

  http.put('*/v1/bookmarks/:article_id', ({ params }) => {
    if (readMockViewer() === 'guest') return unauthorized()
    const article_id = String(params.article_id)
    const article = mockFeedArticles.find((item) => item.id === article_id)
    if (!article) return HttpResponse.json({ code: 'not_found', title: 'Не найдено', status: 404 }, { status: 404 })
    if (!bookmarks.has(article_id)) {
      bookmarks.add(article_id)
      bookmark_order.unshift(article_id)
      article.bookmark_count += 1
    }
    return HttpResponse.json({ article_id, bookmark_count: article.bookmark_count, is_bookmarked: true })
  }),

  http.delete('*/v1/bookmarks/:article_id', ({ params }) => {
    if (readMockViewer() === 'guest') return unauthorized()
    const article_id = String(params.article_id)
    const article = mockFeedArticles.find((item) => item.id === article_id)
    if (!article) return HttpResponse.json({ code: 'not_found', title: 'Не найдено', status: 404 }, { status: 404 })
    if (bookmarks.has(article_id)) {
      bookmarks.delete(article_id)
      const index = bookmark_order.indexOf(article_id)
      if (index >= 0) bookmark_order.splice(index, 1)
      article.bookmark_count = Math.max(0, article.bookmark_count - 1)
    }
    return HttpResponse.json({ article_id, bookmark_count: article.bookmark_count, is_bookmarked: false })
  }),

  http.get('*/v1/bookmarks', () => {
    if (readMockViewer() === 'guest') return unauthorized()
    return HttpResponse.json({ article_ids: [...bookmark_order], next_cursor: null })
  }),

  http.post('*/v1/articles/:article_id/reports', ({ params }) => {
    const actor = currentMockAuthor()
    if (!actor) return unauthorized()
    if (actor.is_restricted) return restricted()
    const article = mockFeedArticles.find((item) => item.id === params.article_id)
    if (!article) return HttpResponse.json({ code: 'not_found', title: 'Статья недоступна', status: 404 }, { status: 404 })
    if (actor.id === article.author.user_id) {
      return HttpResponse.json({ code: 'forbidden', title: 'На свою статью пожаловаться нельзя', status: 403 }, { status: 403 })
    }
    return HttpResponse.json({
      id: crypto.randomUUID(),
      article_id: article.id,
      reporter_id: actor.id,
      created_at: new Date().toISOString(),
      status: 'open',
    })
  }),

  http.post('*/v1/articles/:article_id/promotion', ({ params }) => {
    const actor = currentMockAuthor()
    if (!actor) return unauthorized()
    const article = mockFeedArticles.find((item) => item.id === params.article_id)
    if (!article) return HttpResponse.json({ code: 'not_found', title: 'Статья недоступна', status: 404 }, { status: 404 })
    const is_own = actor.id === article.author.user_id || window.localStorage.getItem('mock_article') === 'own'
    if (!is_own) return HttpResponse.json({ code: 'forbidden', title: 'Продвигать может только автор', status: 403 }, { status: 403 })
    promotedIds.add(article.id)
    const confirmed_at = new Date().toISOString()
    const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    return HttpResponse.json({ article_id: article.id, confirmed_at, until })
  }),
]
