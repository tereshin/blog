import { HttpResponse, http } from 'msw'
import { readMockViewer } from './session.ts'
import { forbidden, readSite, writeSite } from './shell.ts'
import type { SiteTopic } from './shell.ts'

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

export const topicHandlers = [
  http.get('*/v1/topics', ({ request }) => {
    const include_archived = new URL(request.url).searchParams.get('include_archived') === '1'
    if (include_archived && readMockViewer() !== 'superadmin') return forbidden()
    const topics = readSite().topics.filter(
      (topic) => include_archived || topic.status === 'active',
    )
    const listed =
      window.localStorage.getItem('mock_topics') === 'long' ? [...topics, ...longTopics()] : topics
    return HttpResponse.json([...listed].sort((a, b) => a.position - b.position))
  }),
  http.get('*/v1/topics/:slug', ({ params }) => {
    const listed =
      window.localStorage.getItem('mock_topics') === 'long'
        ? [...readSite().topics, ...longTopics()]
        : readSite().topics
    const topic = listed.find((item) => item.slug === params.slug)
    if (!topic)
      return HttpResponse.json({ code: 'not_found', title: 'Такой темы нет' }, { status: 404 })
    return HttpResponse.json(topic)
  }),
  http.post('*/v1/topics', async ({ request }) => {
    if (readMockViewer() !== 'superadmin') return forbidden()
    const body = (await request.json()) as Omit<SiteTopic, 'id' | 'status' | 'position'>
    const state = readSite()
    if (state.topics.some((topic) => topic.slug === body.slug)) {
      return HttpResponse.json(
        { code: 'slug_taken', title: 'Этот адрес уже занят', status: 409 },
        { status: 409 },
      )
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
    if (!topic)
      return HttpResponse.json(
        { code: 'not_found', title: 'Такой темы нет', status: 404 },
        { status: 404 },
      )
    if (body.slug && state.topics.some((item) => item.id !== topic.id && item.slug === body.slug))
      return HttpResponse.json(
        { code: 'slug_taken', title: 'Этот адрес уже занят' },
        { status: 409 },
      )
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
]
