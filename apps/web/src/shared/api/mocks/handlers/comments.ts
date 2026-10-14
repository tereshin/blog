import { HttpResponse, http } from 'msw'
import { mockFeedArticles } from './feed.ts'
import { currentMockAuthor } from './articles-store.ts'
import { commentTree, mockCommentBookmarked, commentsForArticle, mockViewerId, patchStoredComment, readStoredComments, saveComment } from './discussion-store.ts'
import type { StoredComment } from './discussion-store.ts'
import { addMockNotification } from './notifications-store.ts'
import { actorOf, emitLive, emptyCounts, restricted, unauthorized } from './action-responses.ts'

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

export const commentHandlers = [
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
]
