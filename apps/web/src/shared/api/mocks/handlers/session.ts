import { HttpResponse, http } from 'msw'
import fixtures from '../fixtures/session.json'

export const MOCK_VIEWER_KEY = 'mock_viewer'

/** Кто «вошёл» в режиме мока: `guest` (по умолчанию), `member` или `admin`. Флаг живёт только при VITE_API_MOCK=1. */
export function readMockViewer(): 'guest' | 'member' | 'admin' {
  const stored = window.localStorage.getItem(MOCK_VIEWER_KEY)
  return stored === 'member' || stored === 'admin' ? stored : 'guest'
}

export const sessionHandlers = [
  http.get('*/v1/auth/session', () => HttpResponse.json(fixtures[readMockViewer()])),
  http.post('*/v1/auth/logout', () => {
    window.localStorage.removeItem(MOCK_VIEWER_KEY)
    return new HttpResponse(null, { status: 204 })
  }),
]
