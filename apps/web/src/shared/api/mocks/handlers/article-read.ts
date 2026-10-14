import { HttpResponse, delay, http } from 'msw'
import { hiddenArticleIds } from './moderation-store.ts'
import { mockFeedArticles } from './feed.ts'
import { currentMockAuthor, publishedFeedCards, readMockArticles } from './articles-store.ts'
import { readMockViewCount, recordMockView } from './discussion-store.ts'
import { readMockViewer } from './session.ts'
import { emitLive } from './action-responses.ts'

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

export const articleReadHandlers = [
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
      view_count: readMockViewCount(article),
      blocks: { time: 1, version: '2.30.0', blocks },
      status: hiddenArticleIds.has(article.id) ? 'hidden' : 'published',
      is_own: window.localStorage.getItem('mock_article') === 'own',
    })
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
      return card ? [{ ...card, view_count: readMockViewCount(card) }] : []
    })
    return HttpResponse.json({ items })
  }),
]
