import { HttpResponse, http } from 'msw'
import session_fixtures from '../fixtures/session.json'
import { readMockViewer } from './session.ts'
import { markAllMockNotificationsRead, markMockNotificationRead, notificationsFor } from './notifications-store.ts'

function viewerId(): string | null {
  const session = session_fixtures[readMockViewer()]
  return 'user' in session ? session.user.id : null
}

function present(item: ReturnType<typeof notificationsFor>[number]) {
  return {
    id: item.id,
    kind: item.kind,
    article_id: item.article_id,
    article_slug: item.article_slug,
    article_title: item.article_title,
    comment_id: item.comment_id,
    conversation_id: item.conversation_id,
    actor: item.actor,
    read_at: item.read_at,
    created_at: item.created_at,
  }
}

export const notificationHandlers = [
  http.get('*/v1/notifications/unread-count', () => {
    const user_id = viewerId()
    if (!user_id) return HttpResponse.json({ code: 'unauthorized', title: 'Требуется вход' }, { status: 401 })
    return HttpResponse.json({ count: notificationsFor(user_id).filter((item) => item.read_at === null).length })
  }),
  http.get('*/v1/notifications', () => {
    const user_id = viewerId()
    if (!user_id) return HttpResponse.json({ code: 'unauthorized', title: 'Требуется вход' }, { status: 401 })
    return HttpResponse.json({ items: notificationsFor(user_id).map(present), next_cursor: null })
  }),
  http.post('*/v1/notifications/read-all', () => {
    const user_id = viewerId()
    if (!user_id) return HttpResponse.json({ code: 'unauthorized', title: 'Требуется вход' }, { status: 401 })
    markAllMockNotificationsRead(user_id)
    return new HttpResponse(null, { status: 204 })
  }),
  http.post('*/v1/notifications/:id/read', ({ params }) => {
    const user_id = viewerId()
    if (!user_id) return HttpResponse.json({ code: 'unauthorized', title: 'Требуется вход' }, { status: 401 })
    const item = markMockNotificationRead(user_id, String(params.id))
    if (!item) return HttpResponse.json({ code: 'not_found', title: 'Уведомление не найдено' }, { status: 404 })
    return HttpResponse.json(present(item))
  }),
]
