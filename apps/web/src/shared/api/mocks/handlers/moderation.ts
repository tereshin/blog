import { HttpResponse, http } from 'msw'
import { mockFeedArticles } from './feed.ts'
import { hiddenArticleIds, deletedArticleIds, mockReports } from './moderation-store.ts'
import { readMockViewer } from './session.ts'

function staff() {
  const viewer = readMockViewer()
  return viewer === 'admin' || viewer === 'superadmin'
}

function forbidden() {
  return HttpResponse.json(
    { code: 'forbidden', title: 'Недостаточно прав', status: 403 },
    { status: 403 },
  )
}

function cardOf(id: string) {
  const article = mockFeedArticles.find((item) => item.id === id)
  if (!article) return null
  return {
    ...article,
    status: deletedArticleIds.has(id)
      ? 'deleted'
      : hiddenArticleIds.has(id)
        ? 'hidden'
        : 'published',
  }
}

function matchesArticle(article: NonNullable<ReturnType<typeof cardOf>>, params: URLSearchParams) {
  const q = (params.get('q') ?? '').toLowerCase(),
    topic = params.get('topic_id'),
    status = params.get('article_status') ?? 'all'
  return (
    (!q || article.title.toLowerCase().includes(q) || article.slug.toLowerCase() === q) &&
    (!topic || article.topic.id === topic) &&
    (status === 'all' || article.status === status)
  )
}
function mockPage<TItem extends { id: string; created_at: string; article?: { slug: string } }>(
  items: TItem[],
  params: URLSearchParams,
  exact_slug?: string,
) {
  const order = params.get('sort') === 'oldest' ? 1 : -1
  const from = params.get('from'),
    to = params.get('to')
  const sorted = items
    .filter(
      (item) =>
        (!from || item.created_at.slice(0, 10) >= from) &&
        (!to || item.created_at.slice(0, 10) <= to),
    )
    .sort((a, b) => {
      const exact = exact_slug
        ? Number(b.article?.slug === exact_slug) - Number(a.article?.slug === exact_slug)
        : 0
      return exact || order * (a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
    })
  const start = params.get('cursor')
    ? sorted.findIndex((item) => item.id === params.get('cursor')) + 1
    : 0
  const page = sorted.slice(start, start + 50)
  return { items: page, next_cursor: sorted.length > start + 50 ? (page.at(-1)?.id ?? null) : null }
}
export const moderationHandlers = [
  http.get('*/v1/moderation/articles/reports', ({ request }) => {
    if (!staff()) return forbidden()
    const url = new URL(request.url),
      params = url.searchParams
    const status = params.get('status') ?? 'open'
    const items = mockReports
      .filter((report) => status === 'all' || report.status === status)
      .flatMap((report) => {
        const article = cardOf(report.article_id)
        return article && matchesArticle(article, params)
          ? [{ id: report.id, created_at: report.created_at, article, report }]
          : []
      })
    const page = mockPage(items, params)
    return HttpResponse.json({
      ...page,
      items: page.items.map(({ article, report }) => ({ article, report })),
    })
  }),
  http.get('*/v1/moderation/articles', ({ request }) => {
    if (!staff()) return forbidden()
    const params = new URL(request.url).searchParams,
      filter = params.get('filter') ?? 'reported'
    const items = mockFeedArticles.flatMap((row) => {
      const article = cardOf(row.id)
      if (!article || article.status === 'deleted' || !matchesArticle(article, params)) return []
      if (filter === 'hidden' && article.status !== 'hidden') return []
      if (
        filter === 'reported' &&
        !mockReports.some((report) => report.article_id === row.id && report.status === 'open')
      )
        return []
      return [
        {
          id: row.id,
          created_at: article.published_at,
          updated_at: article.published_at,
          article,
          reports: mockReports.filter((report) => report.article_id === row.id),
        },
      ]
    })
    if (filter === 'search')
      items.sort(
        (a, b) =>
          Number(b.article.slug === params.get('q')) - Number(a.article.slug === params.get('q')),
      )
    const page = mockPage(items, params, filter === 'search' ? (params.get('q') ?? '') : undefined)
    return HttpResponse.json({
      ...page,
      items: page.items.map(({ article, reports, updated_at }) => ({
        article,
        reports,
        updated_at,
      })),
    })
  }),

  http.post('*/v1/articles/:id/hide', ({ params }) => {
    if (!staff()) return forbidden()
    hiddenArticleIds.add(String(params.id))
    return HttpResponse.json({ id: params.id, status: 'hidden' })
  }),

  http.post('*/v1/articles/:id/restore', ({ params }) => {
    if (!staff()) return forbidden()
    hiddenArticleIds.delete(String(params.id))
    return HttpResponse.json({ id: params.id, status: 'published' })
  }),

  http.delete('*/v1/moderation/articles/:id', ({ params }) => {
    if (!staff()) return forbidden()
    hiddenArticleIds.add(String(params.id))
    deletedArticleIds.add(String(params.id))
    return new HttpResponse(null, { status: 204 })
  }),

  http.patch('*/v1/reports/:id', async ({ params, request }) => {
    if (!staff()) return forbidden()
    const report = mockReports.find((item) => item.id === params.id)
    if (!report)
      return HttpResponse.json(
        { code: 'not_found', title: 'Не найдено', status: 404 },
        { status: 404 },
      )
    const body = (await request.json()) as { action?: string }
    if (report.status === 'open' && (body.action === 'hide' || body.action === 'delete'))
      hiddenArticleIds.add(report.article_id)
    if (report.status === 'open' && body.action === 'delete')
      deletedArticleIds.add(report.article_id)
    report.status = 'reviewed'
    return HttpResponse.json(report)
  }),

]
