import { HttpResponse, http } from 'msw'
import { mockFeedArticles } from './feed.ts'
import {
  commentTree,
  mockCommentBookmarks,
  mockViewerId,
  readStoredComments,
  setMockCommentBookmark,
  patchStoredComment,
} from './discussion-store.ts'
import session from '../fixtures/session.json'
const notFound = () =>
  HttpResponse.json({ code: 'not_found', title: 'Не найдено' }, { status: 404 })
const denied = () =>
  HttpResponse.json({ code: 'unauthorized', title: 'Требуется вход' }, { status: 401 })
function thread(id: string) {
  const stored = readStoredComments().find((item) => item.id === id)
  const article = mockFeedArticles.find((item) => item.id === stored?.article_id)
  if (!stored || !article) return null
  const root = commentTree(article, mockViewerId()).comments.find(
    (item) => item.id === (stored.parent_id ?? stored.id),
  )
  const target = stored.parent_id ? root?.replies.find((item) => item.id === stored.id) : root
  return root && target
    ? { article_id: article.id, root: { ...root, replies: [] }, target: { ...target, replies: [] } }
    : null
}
type MockReport = {
  id: string
  comment_id: string
  reporter_id: string
  reason: string
  status: 'open' | 'reviewed'
  created_at: string
}
function reports(): MockReport[] {
  return JSON.parse(localStorage.getItem('mock_comment_reports') ?? '[]') as MockReport[]
}
export const commentInteractionHandlers = [
  http.post('*/v1/media', async ({ request }) => {
    const bytes = await request.blob()
    return HttpResponse.json({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(bytes),
      kind: 'image',
      mime: bytes.type,
      byte_size: bytes.size,
    })
  }),
  http.get('*/v1/comments/:id/thread', ({ params }) => {
    const data = thread(String(params.id))
    return data ? HttpResponse.json(data) : notFound()
  }),
  http.get('*/v1/comments/:id/replies', ({ params, request }) => {
    const data = thread(String(params.id))
    const article = mockFeedArticles.find((item) => item.id === data?.article_id)
    if (!article || !data) return notFound()
    const url = new URL(request.url)
    const sort = url.searchParams.get('sort') ?? 'oldest'
    const replies =
      commentTree(article, mockViewerId()).comments.find((item) => item.id === data.root.id)
        ?.replies ?? []
    replies.sort((a, b) =>
      sort === 'best'
        ? b.reaction_count - a.reaction_count || b.id.localeCompare(a.id)
        : sort === 'newest'
          ? b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id)
          : a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
    )
    const start = url.searchParams.get('cursor')
      ? replies.findIndex((item) => item.id === url.searchParams.get('cursor')) + 1
      : 0
    const page = replies.slice(start, start + 20)
    return HttpResponse.json({
      comments: page.map((item) => ({ ...item, replies: [] })),
      next_cursor: replies.length > start + 20 ? page.at(-1)?.id : null,
    })
  }),
  http.put('*/v1/comments/:id/bookmark', ({ params }) => {
    const viewer = mockViewerId()
    if (!viewer) return denied()
    setMockCommentBookmark(String(params.id), viewer, true)
    return HttpResponse.json({ is_bookmarked: true })
  }),
  http.delete('*/v1/comments/:id/bookmark', ({ params }) => {
    const viewer = mockViewerId()
    if (!viewer) return denied()
    setMockCommentBookmark(String(params.id), viewer, false)
    return HttpResponse.json({ is_bookmarked: false })
  }),
  http.get('*/v1/comments/bookmarks', () => {
    const viewer = mockViewerId()
    if (!viewer) return denied()
    const items = mockCommentBookmarks(viewer).flatMap((id) => {
      const data = thread(id)
      const article = mockFeedArticles.find((item) => item.id === data?.article_id)
      return data && article
        ? [
            {
              comment: data.target,
              article_id: article.id,
              article_slug: article.slug,
              article_title: article.title,
            },
          ]
        : []
    })
    return HttpResponse.json({ items, next_cursor: null })
  }),
  http.get('*/v1/comments/:id/reactors', ({ params, request }) => {
    const row = readStoredComments().find((item) => item.id === params.id)
    if (!row) return notFound()
    const kind = new URL(request.url).searchParams.get('kind') ?? 'heart'
    const people = Object.entries(row.reactions)
      .filter(([, value]) => value === kind)
      .map(([id]) => ({
        user_id: id,
        display_name:
          session.member.user.id === id
            ? session.member.profile.display_name
            : row.author.display_name,
        avatar_url: null,
      }))
    return HttpResponse.json({ items: people, next_cursor: null })
  }),
  http.post('*/v1/comments/:id/reports', async ({ params, request }) => {
    const viewer = mockViewerId()
    if (!viewer) return denied()
    const data = thread(String(params.id))
    if (!data) return notFound()
    const input = (await request.json()) as { reason: string }
    const rows = reports()
    let report = rows.find((item) => item.comment_id === params.id && item.reporter_id === viewer)
    if (!report) {
      report = {
        id: crypto.randomUUID(),
        comment_id: String(params.id),
        reporter_id: viewer,
        reason: input.reason,
        status: 'open',
        created_at: new Date().toISOString(),
      }
      rows.push(report)
      localStorage.setItem('mock_comment_reports', JSON.stringify(rows))
    }
    return HttpResponse.json(report, { status: 201 })
  }),
  http.get('*/v1/moderation/comments/reports', () =>
    HttpResponse.json({
      items: reports()
        .filter((row) => row.status === 'open')
        .flatMap((row) => {
          const data = thread(row.comment_id)
          const article = mockFeedArticles.find((item) => item.id === data?.article_id)
          return data && article
            ? [
                {
                  ...row,
                  body: data.target.body,
                  article_id: article.id,
                  article_slug: article.slug,
                },
              ]
            : []
        }),
      next_cursor: null,
    }),
  ),
  http.patch('*/v1/moderation/comments/reports/:id', async ({ params, request }) => {
    const rows = reports()
    const row = rows.find((item) => item.id === params.id)
    if (!row) return notFound()
    const { action } = (await request.json()) as { action: string }
    if (action !== 'dismiss')
      patchStoredComment(row.comment_id, { status: action === 'hide' ? 'hidden' : 'deleted' })
    row.status = 'reviewed'
    localStorage.setItem('mock_comment_reports', JSON.stringify(rows))
    return HttpResponse.json(row)
  }),
  ...(['get', 'put', 'delete'] as const).map((method) =>
    http[method]('*/v1/comments/subscriptions/:id', ({ params }) => {
      const viewer = mockViewerId()
      if (!viewer) return denied()
      const key = `mock_discussion_subscription:${viewer}:${params.id}`
      if (method === 'put') localStorage.setItem(key, '1')
      if (method === 'delete') localStorage.removeItem(key)
      return HttpResponse.json({ is_subscribed: localStorage.getItem(key) === '1' })
    }),
  ),
  http.get('*/v1/comments/mentions', ({ request }) => {
    const q = new URL(request.url).searchParams.get('q')?.toLowerCase() ?? ''
    return HttpResponse.json(
      [session.member, session.author, session.admin]
        .filter((item) => item.profile.display_name.toLowerCase().includes(q))
        .map((item) => ({
          user_id: item.user.id,
          display_name: item.profile.display_name,
          avatar_url: item.profile.avatar_url,
        })),
    )
  }),
]
