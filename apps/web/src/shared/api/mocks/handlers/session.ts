import { HttpResponse, http } from 'msw'
import fixtures from '../fixtures/session.json'

export const MOCK_VIEWER_KEY = 'mock_viewer'

const VIEWERS = ['member', 'admin', 'superadmin', 'no_publish', 'author', 'restricted'] as const
type MockViewer = (typeof VIEWERS)[number] | 'guest'

/** Кто «вошёл» в режиме мока. Флаг живёт только при VITE_API_MOCK=1. */
export function readMockViewer(): MockViewer {
  const stored = window.localStorage.getItem(MOCK_VIEWER_KEY)
  return VIEWERS.find((viewer) => viewer === stored) ?? 'guest'
}

const appearance_by_viewer = new Map<MockViewer, 'light' | 'dark'>()

export const sessionHandlers = [
  http.get('*/v1/auth/session', () => {
    const viewer = readMockViewer()
    const fixture = fixtures[viewer]
    const appearance = appearance_by_viewer.get(viewer)
    if (!appearance || !('user' in fixture)) return HttpResponse.json(fixture)
    return HttpResponse.json({ ...fixture, user: { ...fixture.user, appearance } })
  }),
  http.patch('*/v1/users/me/appearance', async ({ request }) => {
    const viewer = readMockViewer()
    if (viewer === 'guest') return HttpResponse.json({ code: 'unauthorized' }, { status: 401 })
    const body = (await request.json()) as { appearance?: 'light' | 'dark' }
    if (body.appearance !== 'light' && body.appearance !== 'dark') {
      return HttpResponse.json({ code: 'validation_failed' }, { status: 422 })
    }
    appearance_by_viewer.set(viewer, body.appearance)
    return HttpResponse.json({ appearance: body.appearance })
  }),
  http.post('*/v1/auth/logout', () => {
    window.localStorage.removeItem(MOCK_VIEWER_KEY)
    return new HttpResponse(null, { status: 204 })
  }),
]
