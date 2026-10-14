import { HttpResponse, http } from 'msw'
import { mockFeedArticles } from './feed.ts'
import { mockViewerId, patchStoredComment } from './discussion-store.ts'
import { denied, notFound, thread } from './comment-interactions.ts'

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

export const commentReportHandlers = [
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
  http.get('*/v1/moderation/comments/reports', ({ request }) => {
    const params = new URL(request.url).searchParams,
      status = params.get('status') ?? 'open',
      q = (params.get('q') ?? '').toLowerCase()
    const items = reports()
      .filter((row) => status === 'all' || row.status === status)
      .flatMap((row) => {
        const data = thread(row.comment_id),
          article = mockFeedArticles.find((item) => item.id === data?.article_id)
        return data &&
          article &&
          (!q ||
            (data.target.body ?? '').toLowerCase().includes(q) ||
            row.reason.toLowerCase().includes(q) ||
            article.slug === q)
          ? [
              {
                ...row,
                body: data.target.body,
                author_id: data.target.author.user_id,
                author_name: data.target.author.display_name,
                article_id: article.id,
                article_slug: article.slug,
              },
            ]
          : []
      })
      .filter(
        (row) =>
          (!params.get('from') || row.created_at.slice(0, 10) >= (params.get('from') ?? '')) &&
          (!params.get('to') || row.created_at.slice(0, 10) <= (params.get('to') ?? '')),
      )
      .sort(
        (a, b) =>
          (params.get('sort') === 'oldest' ? 1 : -1) *
          (a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)),
      )
    const start = params.get('cursor')
        ? items.findIndex((row) => row.id === params.get('cursor')) + 1
        : 0,
      page = items.slice(start, start + 50)
    return HttpResponse.json({
      items: page,
      next_cursor: items.length > start + 50 ? page.at(-1)?.id : null,
    })
  }),
  http.patch('*/v1/moderation/comments/reports/:id', async ({ params, request }) => {
    const rows = reports()
    const row = rows.find((item) => item.id === params.id)
    if (!row) return notFound()
    const { action } = (await request.json()) as { action: string }
    if (row.status === 'open' && action !== 'dismiss')
      patchStoredComment(row.comment_id, { status: action === 'hide' ? 'hidden' : 'deleted' })
    row.status = 'reviewed'
    localStorage.setItem('mock_comment_reports', JSON.stringify(rows))
    return HttpResponse.json(row)
  }),
]
