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

export const sessionHandlers = [
  http.get('*/v1/auth/session', () => HttpResponse.json(fixtures[readMockViewer()])),
  http.post('*/v1/auth/logout', () => {
    window.localStorage.removeItem(MOCK_VIEWER_KEY)
    return new HttpResponse(null, { status: 204 })
  }),
]
