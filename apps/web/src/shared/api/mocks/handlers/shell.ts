import { HttpResponse, http } from 'msw'
import { DEFAULT_REACTION_APPEARANCES } from '@blog/contracts'
import type { ReactionAppearances } from '@blog/contracts'
import popular_comments from '../fixtures/popular-comments.json'
import settings_fixture from '../fixtures/settings.json'
import topics_fixture from '../fixtures/topics.json'
import { readMockViewer } from './session.ts'

const SITE_KEY = 'mock_site'

type SiteSettings = {
  name: string
  logo_url: string | null
  locale: 'ru' | 'en' | 'sr'
  about: string
  registration_open: boolean
  new_members_can_publish: boolean
  reaction_appearances: ReactionAppearances
}

type SiteTopic = {
  id: string
  slug: string
  title: string
  description: string | null
  avatar_url: string | null
  cover_url: string | null
  status: 'active' | 'archived'
  position: number
}

type SiteState = { settings: SiteSettings; topics: SiteTopic[] }

function initialState(): SiteState {
  return {
    settings: {
      ...settings_fixture,
      locale: settings_fixture.locale as SiteSettings['locale'],
      registration_open: true,
      new_members_can_publish: true,
      reaction_appearances: DEFAULT_REACTION_APPEARANCES,
    },
    topics: topics_fixture.map((topic) => ({ ...topic, status: topic.status as SiteTopic['status'] })),
  }
}

function readSite(): SiteState {
  const raw = window.sessionStorage.getItem(SITE_KEY)
  if (!raw) return initialState()
  const parsed = JSON.parse(raw) as SiteState
  return { ...parsed, settings: { ...initialState().settings, ...parsed.settings } }
}

function writeSite(state: SiteState): void {
  window.sessionStorage.setItem(SITE_KEY, JSON.stringify(state))
}

function publicSettings(settings: SiteSettings) {
  return {
    name: settings.name,
    logo_url: settings.logo_url,
    locale: settings.locale,
    about: settings.about,
    reaction_appearances: settings.reaction_appearances,
  }
}

function longTopics(): SiteTopic[] {
  return Array.from({ length: 20 }, (_, index) => ({
    id: `5f0f6a52-0d8b-4f6e-a8b1-${String(index + 20).padStart(12, '0')}`,
    slug: `dlinnaya-${index + 1}`,
    title: `Длинная тема ${index + 1}`,
    description: null,
    avatar_url: null,
    cover_url: null,
    status: 'active' as const,
    position: 50 + index,
  }))
}

function forbidden() {
  return HttpResponse.json({ code: 'forbidden', title: 'Раздел доступен только администратору площадки', status: 403 }, { status: 403 })
}

/** Данные колонок каркаса. Правки суперадминистратора живут в sessionStorage вкладки, чтобы пережить перезагрузку. */
export const shellHandlers = [
  http.get('*/v1/settings/admin', () => {
    if (readMockViewer() !== 'superadmin') return forbidden()
    return HttpResponse.json(readSite().settings)
  }),
  http.get('*/v1/settings', () => HttpResponse.json(publicSettings(readSite().settings))),
  http.put('*/v1/settings', async ({ request }) => {
    if (readMockViewer() !== 'superadmin') return forbidden()
    const body = (await request.json()) as SiteSettings
    const state = readSite()
    state.settings = body
    writeSite(state)
    return HttpResponse.json(state.settings)
  }),
  http.get('*/v1/topics', ({ request }) => {
    const include_archived = new URL(request.url).searchParams.get('include_archived') === '1'
    if (include_archived && readMockViewer() !== 'superadmin') return forbidden()
    const topics = readSite().topics.filter((topic) => include_archived || topic.status === 'active')
    const listed = window.localStorage.getItem('mock_topics') === 'long' ? [...topics, ...longTopics()] : topics
    return HttpResponse.json([...listed].sort((a, b) => a.position - b.position))
  }),
  http.get('*/v1/topics/:slug', ({ params }) => {
    const listed = window.localStorage.getItem('mock_topics') === 'long' ? [...readSite().topics, ...longTopics()] : readSite().topics
    const topic = listed.find((item) => item.slug === params.slug)
    if (!topic) return HttpResponse.json({ code: 'not_found', title: 'Такой темы нет' }, { status: 404 })
    return HttpResponse.json(topic)
  }),
  http.post('*/v1/topics', async ({ request }) => {
    if (readMockViewer() !== 'superadmin') return forbidden()
    const body = (await request.json()) as Omit<SiteTopic, 'id' | 'status' | 'position'>
    const state = readSite()
    if (state.topics.some((topic) => topic.slug === body.slug)) {
      return HttpResponse.json({ code: 'slug_taken', title: 'Этот адрес уже занят', status: 409 }, { status: 409 })
    }
    const topic: SiteTopic = {
      id: crypto.randomUUID(),
      title: body.title,
      description: body.description,
      avatar_url: body.avatar_url,
      cover_url: body.cover_url,
      slug: body.slug,
      status: 'active',
      position: state.topics.reduce((max, item) => Math.max(max, item.position), -1) + 1,
    }
    state.topics.push(topic)
    writeSite(state)
    return HttpResponse.json(topic, { status: 201 })
  }),
  http.patch('*/v1/topics/:id', async ({ params, request }) => {
    if (readMockViewer() !== 'superadmin') return forbidden()
    const body = (await request.json()) as Partial<SiteTopic>
    const state = readSite()
    const topic = state.topics.find((item) => item.id === params.id)
    if (!topic) return HttpResponse.json({ code: 'not_found', title: 'Такой темы нет', status: 404 }, { status: 404 })
    Object.assign(topic, body)
    writeSite(state)
    return HttpResponse.json(topic)
  }),
  http.put('*/v1/topics/order', async ({ request }) => {
    if (readMockViewer() !== 'superadmin') return forbidden()
    const body = (await request.json()) as { topic_ids: string[] }
    const state = readSite()
    body.topic_ids.forEach((id, index) => {
      const topic = state.topics.find((item) => item.id === id)
      if (topic) topic.position = index
    })
    writeSite(state)
    return HttpResponse.json([...state.topics].sort((a, b) => a.position - b.position))
  }),
  http.get('*/v1/comments/popular', () => {
    const mode = window.localStorage.getItem('mock_rail')
    if (mode === 'empty') return HttpResponse.json([])
    if (mode === 'error') return HttpResponse.json({ code: 'unavailable', title: 'Не удалось загрузить комментарии', status: 500 }, { status: 500 })
    return HttpResponse.json(popular_comments)
  }),
  http.put('*/v1/events/subscriptions', () => HttpResponse.json({ article_ids: [] })),
]
