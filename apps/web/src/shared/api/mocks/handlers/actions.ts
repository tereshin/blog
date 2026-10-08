import { HttpResponse, http } from 'msw'
import { mockFeedArticles } from './feed.ts'
import type { FeedCardFixture } from '../fixtures/feed.ts'
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
    if (article.comment_count === 0) return HttpResponse.json({ comments: [], next_cursor: null })
    return HttpResponse.json({
      comments: [
        {
          id: article.top_comment?.id ?? `7a1c2d30-1111-4a11-8a11-${article.id.slice(-12)}`,
          author: { user_id: 'a1000000-0000-4000-8000-000000000002', display_name: 'Борис Писарев', avatar_url: null },
          body: article.top_comment?.excerpt ?? 'Хороший разбор, спасибо.',
          status: 'visible',
          edited_at: null,
          reaction_counts: { laugh: 1, heart: 0, thumb: 0, fire: 0 },
          reaction_count: 1,
          my_reaction: null,
          created_at: article.published_at,
          replies: [],
        },
      ],
      next_cursor: null,
    })
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
    const article = mockFeedArticles.find((item) => item.id === target_id)
    if (!article || !isKind(kind)) return HttpResponse.json({ code: 'validation_failed', title: 'Данные не прошли проверку', status: 422 }, { status: 422 })
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
