import { HttpResponse, http } from 'msw'
import topics_fixture from '../fixtures/topics.json'
import { mockFeedArticles } from './feed.ts'
import { publishedFeedCards } from './articles-store.ts'

const DRAFT_TITLE = 'Черновик про компромиссы'

const PEOPLE = [
  { user_id: 'a1000000-0000-4000-8000-000000000001', display_name: 'Анна Авторова', avatar_url: null, slug: 'anna', reputation: 4 },
  { user_id: '0b3a4c50-3333-4c33-8c33-000000000005', display_name: 'Роман Читаев', avatar_url: null, slug: 'reader', reputation: 1 },
]

/** Поиск фикстур: черновик в выдачу не попадает. */
export const searchHandlers = [
  http.get('*/v1/search', ({ request }) => {
    const q = new URL(request.url).searchParams.get('q')?.trim() ?? ''
    if (q.length < 2 || q.length > 100) return HttpResponse.json({ code: 'validation_failed', title: 'Данные не прошли проверку' }, { status: 422 })
    const needle = q.toLowerCase()
    const articles = [...publishedFeedCards(), ...mockFeedArticles].filter(
      (article) => article.title !== DRAFT_TITLE && (article.title.toLowerCase().includes(needle) || article.excerpt.toLowerCase().includes(needle)),
    )
    const people = PEOPLE.filter((person) => person.display_name.toLowerCase().includes(needle) || person.slug.includes(needle))
    const topics = topics_fixture
      .filter((topic) => topic.status === 'active' && (topic.title.toLowerCase().includes(needle) || (topic.description ?? '').toLowerCase().includes(needle)))
      .map((topic) => ({ ...topic, description: topic.description ?? null, avatar_url: topic.avatar_url ?? null, cover_url: topic.cover_url ?? null }))
    return HttpResponse.json({ articles: articles.slice(0, 20), people, topics, next_cursor: null })
  }),
]
