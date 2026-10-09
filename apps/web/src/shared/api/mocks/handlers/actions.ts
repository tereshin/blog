import { HttpResponse, http } from 'msw'
import { mockFeedArticles } from './feed.ts'
import type { FeedCardFixture } from '../fixtures/feed.ts'
import { currentMockAuthor } from './articles-store.ts'
import { commentTree, commentsForArticle, mockViewerId, patchStoredComment, readStoredComments, recordMockView, saveComment } from './discussion-store.ts'
import type { StoredComment } from './discussion-store.ts'
import { readMockViewer } from './session.ts'

const KINDS = ['laugh', 'heart', 'thumb', 'fire'] as const
type Kind = (typeof KINDS)[number]

const mine = new Map<string, Kind>()
const bookmarks = new Set<string>()

function isKind(value: unknown): value is Kind {
  return typeof value === 'string' && (KINDS as readonly string[]).includes(value)
}

function reactionBody(article: FeedCardFixture, my_reaction: Kind | null) {
  const reaction_count = KINDS.reduce((sum, kind) => sum + article.reaction_counts[kind], 0)
  article.reaction_count = reaction_count
  return { reaction_counts: { ...article.reaction_counts }, reaction_count, my_reaction }
}

function unauthorized() {
  return HttpResponse.json({ code: 'unauthorized', title: 'Требуется вход', status: 401 }, { status: 401 })
}

function restricted() {
  return HttpResponse.json({ code: 'restricted', title: 'Действие недоступно: участник ограничен', status: 403 }, { status: 403 })
}

function emitLive(type: string, article_id: string): void {
  const events = (window as Window & { mockEvents?: { emit: (frame: { type: string; article_id: string }) => void } }).mockEvents
  events?.emit({ type, article_id })
}

function emptyCounts(): Record<Kind, number> {
  return { laugh: 0, heart: 0, thumb: 0, fire: 0 }
}

function presentStored(row: StoredComment, viewer_id: string) {
  const siblings = readStoredComments().filter((item) => item.article_id === row.article_id)
  const node = (item: StoredComment) => ({
    id: item.id,
    author: item.author,
    body: item.status === 'visible' ? item.body : null,
    status: item.status,
    edited_at: item.edited_at,
    reaction_counts: item.reaction_counts,
    reaction_count: Object.values(item.reaction_counts).reduce((sum, count) => sum + count, 0),
    my_reaction: item.reactions[viewer_id] ?? null,
    created_at: item.created_at,
  })
  const replies = siblings.filter((item) => item.parent_id === row.id && item.status === 'visible').map(node)
  return { ...node(row), replies: row.parent_id ? [] : replies }
}

export const actionHandlers = [
  http.get('*/v1/articles/:slug', ({ params }) => {
    const article = mockFeedArticles.find((item) => item.slug === params.slug)
    if (!article) {
      return HttpResponse.json(
        { type: 'about:blank', title: 'Статья недоступна', status: 404, code: 'not_found', errors: { reason: 'unavailable' } },
        { status: 404 },
      )
    }
    return HttpResponse.json({
      ...article,
      blocks: {
        time: 1,
        version: '2.30.0',
        blocks: [
          { type: 'paragraph', data: { text: article.excerpt } },
          { type: 'paragraph', data: { text: 'Полный текст статьи для проверки раскрытия.' } },
          { type: 'image', data: { file: { url: 'https://example.com/cover-1.png' }, caption: 'Первое изображение' } },
          { type: 'image', data: { file: { url: 'https://example.com/cover-2.png' }, caption: 'Второе изображение' } },
        ],
      },
      status: 'published',
      is_own: window.localStorage.getItem('mock_article') === 'own',
    })
  }),

  http.get('*/v1/articles/:article_id/comments', ({ params }) => {
    const article = mockFeedArticles.find((item) => item.id === params.article_id)
    if (!article) {
      return HttpResponse.json({ code: 'not_found', title: 'Статья недоступна', status: 404 }, { status: 404 })
    }
    return HttpResponse.json(commentTree(article, mockViewerId()))
  }),

  http.post('*/v1/articles/:article_id/comments', async ({ params, request }) => {
    const actor = currentMockAuthor()
    if (!actor) return unauthorized()
    if (actor.is_restricted) return restricted()
    const article = mockFeedArticles.find((item) => item.id === params.article_id)
    if (!article) return HttpResponse.json({ code: 'not_found', title: 'Статья недоступна', status: 404 }, { status: 404 })
    if (!article.comments_enabled) return HttpResponse.json({ code: 'comments_disabled', title: 'Комментарии выключены', status: 403 }, { status: 403 })
    const payload: unknown = await request.json()
    const body = typeof payload === 'object' && payload && 'body' in payload ? String(payload.body) : ''
    const parent_id = typeof payload === 'object' && payload && 'parent_id' in payload ? String(payload.parent_id) : null
    if (body.length < 1 || body.length > 5000) {
      return HttpResponse.json({ code: 'validation_failed', title: 'Данные не прошли проверку', status: 422 }, { status: 422 })
    }
    if (parent_id) {
      const parent = commentsForArticle(article).find((item) => item.id === parent_id)
      if (!parent || parent.parent_id) {
        return HttpResponse.json({ code: 'validation_failed', title: 'Ответить на этот комментарий нельзя', status: 422, errors: { reason: 'parent' } }, { status: 422 })
      }
    }
    const row: StoredComment = {
      id: crypto.randomUUID(),
      article_id: article.id,
      parent_id,
      author: { user_id: actor.id, display_name: actor.display_name, avatar_url: null },
      body,
      status: 'visible',
      edited_at: null,
      reaction_counts: emptyCounts(),
      reactions: {},
      created_at: new Date().toISOString(),
    }
    saveComment(row)
    emitLive('comment', article.id)
    return HttpResponse.json(presentStored(row, actor.id), { status: 201 })
  }),

  http.patch('*/v1/comments/:id', async ({ params, request }) => {
    const actor = currentMockAuthor()
    if (!actor) return unauthorized()
    if (actor.is_restricted) return restricted()
    const payload: unknown = await request.json()
    const body = typeof payload === 'object' && payload && 'body' in payload ? String(payload.body) : ''
    const current = readStoredComments().find((item) => item.id === params.id && item.author.user_id === actor.id && item.status === 'visible')
    if (!current || body.length < 1) return HttpResponse.json({ code: 'not_found', title: 'Комментарий недоступен', status: 404 }, { status: 404 })
    const next = patchStoredComment(current.id, { body, edited_at: new Date().toISOString() })
    if (!next) return HttpResponse.json({ code: 'not_found', title: 'Комментарий недоступен', status: 404 }, { status: 404 })
    emitLive('comment', next.article_id)
    return HttpResponse.json(presentStored(next, actor.id))
  }),

  http.delete('*/v1/comments/:id', ({ params }) => {
    const actor = currentMockAuthor()
    if (!actor) return unauthorized()
    if (actor.is_restricted) return restricted()
    const current = readStoredComments().find((item) => item.id === params.id && item.author.user_id === actor.id && item.status === 'visible')
    if (!current) return HttpResponse.json({ code: 'not_found', title: 'Комментарий недоступен', status: 404 }, { status: 404 })
    const next = patchStoredComment(current.id, { status: 'deleted' })
    if (!next) return HttpResponse.json({ code: 'not_found', title: 'Комментарий недоступен', status: 404 }, { status: 404 })
    emitLive('comment', next.article_id)
    return HttpResponse.json(presentStored(next, actor.id))
  }),

  http.post('*/v1/articles/:article_id/views', async ({ params, request }) => {
    const article = mockFeedArticles.find((item) => item.id === params.article_id)
    if (!article) return HttpResponse.json({ code: 'not_found', title: 'Статья недоступна', status: 404 }, { status: 404 })
    const payload: unknown = await request.json().catch(() => ({}))
    const context = typeof payload === 'object' && payload && 'context' in payload ? payload.context : undefined
    const actor = currentMockAuthor()
    const is_author = actor?.id === article.author.user_id
    const is_moderation = context === 'moderation' && (readMockViewer() === 'admin' || readMockViewer() === 'superadmin')
    const viewer_key = actor ? `user:${actor.id}` : 'guest:mock'
    const result = recordMockView(article, viewer_key, is_author, is_moderation)
    if (result.counted) emitLive('view', article.id)
    return HttpResponse.json(result)
  }),

  http.get('*/v1/articles', ({ request }) => {
    const ids = new URL(request.url).searchParams.get('ids')?.split(',').filter(Boolean) ?? []
    const items = ids.flatMap((id) => mockFeedArticles.filter((item) => item.id === id))
    return HttpResponse.json({ items })
  }),

  http.get('*/v1/me/article-states', ({ request }) => {
    if (readMockViewer() === 'guest') return HttpResponse.json({ states: {} })
    const ids = new URL(request.url).searchParams.get('article_ids')?.split(',').filter(Boolean) ?? []
    const states: Record<string, { my_reaction: Kind | null; is_bookmarked: boolean }> = {}
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
    if (!isKind(kind)) return HttpResponse.json({ code: 'validation_failed', title: 'Данные не прошли проверку', status: 422 }, { status: 422 })
    const comment = readStoredComments().find((item) => item.id === target_id && item.status === 'visible')
    if (comment && actor) {
      const counts = { ...comment.reaction_counts }
      const current = comment.reactions[actor.id] ?? null
      if (current) counts[current] = Math.max(0, counts[current] - 1)
      const next = current === kind ? null : kind
      if (next) counts[next] += 1
      const reactions: Record<string, Kind> = {}
      for (const [id, value] of Object.entries(comment.reactions)) {
        if (id !== actor.id && isKind(value)) reactions[id] = value
      }
      if (next) reactions[actor.id] = next
      const saved = patchStoredComment(comment.id, { reaction_counts: counts, reactions })
      emitLive('reaction', comment.article_id)
      const reaction_count = KINDS.reduce((sum, item) => sum + counts[item], 0)
      return HttpResponse.json({ reaction_counts: saved?.reaction_counts ?? counts, reaction_count, my_reaction: next })
    }
    const article = mockFeedArticles.find((item) => item.id === target_id)
    if (!article) return HttpResponse.json({ code: 'validation_failed', title: 'Данные не прошли проверку', status: 422 }, { status: 422 })
    const current = mine.get(article.id) ?? null
    if (current) article.reaction_counts[current] = Math.max(0, article.reaction_counts[current] - 1)
    const next = current === kind ? null : kind
    if (next) {
      article.reaction_counts[next] += 1
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
      article.bookmark_count = Math.max(0, article.bookmark_count - 1)
    }
    return HttpResponse.json({ article_id, bookmark_count: article.bookmark_count, is_bookmarked: false })
  }),
]
