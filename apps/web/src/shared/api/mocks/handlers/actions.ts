import { HttpResponse, delay, http } from 'msw'
import { promotedIds } from './engagement-store.ts'
import { hiddenArticleIds } from './moderation-store.ts'
import { mockFeedArticles } from './feed.ts'
import type { FeedCardFixture } from '../fixtures/feed.ts'
import { currentMockAuthor, publishedFeedCards, readMockArticles } from './articles-store.ts'
import { commentTree, mockCommentBookmarked, commentsForArticle, mockViewerId, patchStoredComment, readStoredComments, recordMockView, saveComment } from './discussion-store.ts'
import type { StoredComment } from './discussion-store.ts'
import { addMockNotification } from './notifications-store.ts'
import { readMockViewer } from './session.ts'
import session_fixtures from '../fixtures/session.json'

const KINDS = ['laugh', 'heart', 'thumb', 'fire'] as const
type Kind = (typeof KINDS)[number]

const mine = new Map<string, Kind>()
const bookmarks = new Set<string>()
const bookmark_order: string[] = []
const follows = new Set<string>()
const seen_by_key = new Map<string, string[]>()

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

function emitLive(type: string, fields: { article_id?: string; notification_id?: string; comment_id?: string }): void {
  const events = (window as Window & { mockEvents?: { emit: (frame: { type: string }) => void } }).mockEvents
  events?.emit({ type, ...fields })
}

function actorOf(request: Request) {
  if (request.headers.get('x-mock-actor') === 'member') {
    const session = session_fixtures.member
    return { id: session.user.id, can_publish: session.user.can_publish, is_restricted: session.user.is_restricted, display_name: session.profile.display_name, slug: session.profile.slug }
  }
  return currentMockAuthor()
}

function emptyCounts(): Record<Kind, number> {
  return { laugh: 0, heart: 0, thumb: 0, fire: 0 }
}

function presentStored(row: StoredComment, viewer_id: string) {
  const siblings = readStoredComments().filter((item) => item.article_id === row.article_id)
  const node = (item: StoredComment) => ({
    id: item.id,
    author: item.author,
    reply_count: siblings.filter((child) => child.parent_id === item.id && child.status === 'visible').length,
    is_bookmarked: mockCommentBookmarked(item.id, viewer_id),
    media: item.status === 'visible' ? item.media ?? [] : [],
    mentions: item.status === 'visible' ? item.mentions ?? [] : [],
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

/** `hold` ждёт, пока тест снимет флаг; `1` — короткая пауза. */
async function waitForArticleDelay(): Promise<void> {
  const flag = window.localStorage.getItem('mock_article_delay')
  if (flag === '1') {
    await delay(2000)
    return
  }
  if (flag !== 'hold') return
  await new Promise<void>((resolve) => {
    const timer = window.setInterval(() => {
      if (window.localStorage.getItem('mock_article_delay') !== 'hold') {
        window.clearInterval(timer)
        resolve()
      }
    }, 40)
  })
}

export const actionHandlers = [
  http.get('*/v1/articles/:slug', async ({ params }) => {
    await waitForArticleDelay()
    const stored = readMockArticles().find((item) => item.slug === params.slug && item.status === 'published')
    if (stored) {
      const viewer = currentMockAuthor()
      const is_admin = readMockViewer() === 'admin' || readMockViewer() === 'superadmin'
      const is_author = viewer?.id === stored.author_id
      if (stored.visibility === 'members' && !viewer) {
        return HttpResponse.json(
          { type: 'about:blank', title: 'Статья доступна участникам', status: 401, code: 'unauthorized', errors: { reason: 'members_only' } },
          { status: 401 },
        )
      }
      if (stored.visibility === 'author' && !is_author && !is_admin) {
        return HttpResponse.json(
          { type: 'about:blank', title: 'Статья недоступна', status: 404, code: 'not_found', errors: { reason: 'unavailable' } },
          { status: 404 },
        )
      }
      const card = publishedFeedCards().find((item) => item.id === stored.id)
      if (!card) {
        return HttpResponse.json(
          { type: 'about:blank', title: 'Статья недоступна', status: 404, code: 'not_found', errors: { reason: 'unavailable' } },
          { status: 404 },
        )
      }
      return HttpResponse.json({ ...card, blocks: stored.blocks, status: 'published', is_own: is_author })
    }
    const article = mockFeedArticles.find((item) => item.slug === params.slug)
    if (article && hiddenArticleIds.has(article.id)) {
      const viewer = readMockViewer()
      const is_staff = viewer === 'admin' || viewer === 'superadmin'
      const is_author = viewer === 'author' && article.author.user_id === 'a1000000-0000-4000-8000-000000000001'
      if (!is_staff && !is_author) {
        return HttpResponse.json(
          { type: 'about:blank', title: 'Статья недоступна', status: 404, code: 'not_found', errors: { reason: 'unavailable' } },
          { status: 404 },
        )
      }
    }
    if (!article) {
      return HttpResponse.json(
        { type: 'about:blank', title: 'Статья недоступна', status: 404, code: 'not_found', errors: { reason: 'unavailable' } },
        { status: 404 },
      )
    }
    const long = window.localStorage.getItem('mock_article_length') === 'long'
    const blocks = long
      ? Array.from({ length: 40 }, (_, index) => ({
          type: 'paragraph',
          data: { text: `Абзац ${index + 1}. Длинный текст статьи, чтобы центр можно было прокрутить до кнопки возврата наверх.` },
        }))
      : [
          { type: 'paragraph', data: { text: article.excerpt } },
          { type: 'paragraph', data: { text: 'Полный текст статьи для проверки раскрытия.' } },
          { type: 'image', data: { file: { url: 'https://example.com/cover-1.png' }, caption: 'Первое изображение' } },
          { type: 'image', data: { file: { url: 'https://example.com/cover-2.png' }, caption: 'Второе изображение' } },
        ]
    return HttpResponse.json({
      ...article,
      blocks: { time: 1, version: '2.30.0', blocks },
      status: hiddenArticleIds.has(article.id) ? 'hidden' : 'published',
      is_own: window.localStorage.getItem('mock_article') === 'own',
    })
  }),

  http.get('*/v1/articles/:article_id/comments', ({ params, request }) => {
    const article = mockFeedArticles.find((item) => item.id === params.article_id)
    if (!article) {
      return HttpResponse.json({ code: 'not_found', title: 'Статья недоступна', status: 404 }, { status: 404 })
    }
    const url = new URL(request.url)
    const sort = url.searchParams.get('sort') ?? 'oldest'
    const tree = commentTree(article, mockViewerId())
    const sorted = tree.comments.sort((a, b) => sort === 'best' ? b.reaction_count - a.reaction_count || b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id) : sort === 'newest' ? b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id) : a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
    const start = url.searchParams.get('cursor') ? sorted.findIndex((item) => item.id === url.searchParams.get('cursor')) + 1 : 0
    const limit = Number(url.searchParams.get('limit') ?? 20)
    const page = sorted.slice(start, start + limit)
    return HttpResponse.json({ comments: page.map((item) => ({ ...item, replies: url.searchParams.get('include_replies') === 'false' ? [] : item.replies })), next_cursor: sorted.length > start + limit ? page.at(-1)?.id : null })
  }),

  http.post('*/v1/articles/:article_id/comments', async ({ params, request }) => {
    const actor = actorOf(request)
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
      ...(typeof payload === 'object' && payload && 'media' in payload ? { media: payload.media as StoredComment['media'] } : {}),
      ...(typeof payload === 'object' && payload && 'mentions' in payload ? { mentions: payload.mentions as StoredComment['mentions'] } : {}),
      status: 'visible',
      edited_at: null,
      reaction_counts: emptyCounts(),
      reactions: {},
      created_at: new Date().toISOString(),
    }
    saveComment(row)
    emitLive('comment', { article_id: article.id })
    if (actor.id !== article.author.user_id) {
      const notification_id = crypto.randomUUID()
      addMockNotification({
        id: notification_id,
        user_id: article.author.user_id,
        kind: parent_id ? 'reply' : 'comment',
        article_id: article.id,
        article_slug: article.slug,
        article_title: article.title,
        comment_id: row.id,
        conversation_id: null,
        actor: { display_name: actor.display_name, avatar_url: null },
        read_at: null,
        created_at: new Date().toISOString(),
      })
      emitLive('notification', { notification_id, article_id: article.id, comment_id: row.id })
    }
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
    emitLive('comment', { article_id: next.article_id })
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
    emitLive('comment', { article_id: next.article_id })
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
    if (result.counted) emitLive('view', { article_id: article.id })
    return HttpResponse.json(result)
  }),

  http.get('*/v1/articles', ({ request }) => {
    const ids = new URL(request.url).searchParams.get('ids')?.split(',').filter(Boolean) ?? []
    const source = [...publishedFeedCards(), ...mockFeedArticles]
    const viewer = readMockViewer()
    const is_staff = viewer === 'admin' || viewer === 'superadmin'
    const items = ids.flatMap((id) => {
      if (hiddenArticleIds.has(id) && !is_staff) return []
      const card = source.find((item) => item.id === id)
      return card ? [card] : []
    })
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
      emitLive('reaction', { article_id: comment.article_id })
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
    follows.add(`${target_type}:${target_id}`)
    return HttpResponse.json({ target_type, target_id, is_following: true })
  }),

  http.delete('*/v1/follows', async ({ request }) => {
    const actor = currentMockAuthor()
    if (!actor) return unauthorized()
    if (actor.is_restricted) return restricted()
    const body: unknown = await request.json()
    const target_type = typeof body === 'object' && body && 'target_type' in body ? String(body.target_type) : ''
    const target_id = typeof body === 'object' && body && 'target_id' in body ? String(body.target_id) : ''
    follows.delete(`${target_type}:${target_id}`)
    return HttpResponse.json({ target_type, target_id, is_following: false })
  }),

  http.get('*/v1/me/follows', ({ request }) => {
    const actor = currentMockAuthor()
    if (!actor) return unauthorized()
    const url = new URL(request.url)
    const target_type = url.searchParams.get('target_type') ?? 'user'
    const target_ids = url.searchParams.get('target_ids')?.split(',').filter(Boolean) ?? []
    return HttpResponse.json({
      items: target_ids.map((target_id) => ({ target_type, target_id, is_following: follows.has(`${target_type}:${target_id}`) })),
    })
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
    return HttpResponse.json({ id: crypto.randomUUID() })
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
