import { HttpResponse, http } from 'msw'
import { readMockViewer } from './session.ts'
import {
  addMockMessage,
  conversationsFor,
  isRestricted,
  markMockConversationRead,
  messagesForConversation,
  unreadCountFor,
  viewerIdOf,
} from './messages-store.ts'

function actorId(request: Request): string | null {
  const actor = request.headers.get('x-mock-actor')
  if (actor === 'author' || actor === 'member' || actor === 'admin' || actor === 'superadmin' || actor === 'no_publish' || actor === 'restricted') {
    return viewerIdOf(actor)
  }
  return viewerIdOf(readMockViewer())
}

function unauthorized() {
  return HttpResponse.json({ code: 'unauthorized', title: 'Требуется вход' }, { status: 401 })
}

function restricted() {
  return HttpResponse.json({ code: 'restricted', title: 'Действие недоступно: участник ограничен' }, { status: 403 })
}

export const messageHandlers = [
  http.get('*/v1/conversations/unread-count', ({ request }) => {
    const user_id = actorId(request)
    if (!user_id) return unauthorized()
    return HttpResponse.json({ count: unreadCountFor(user_id) })
  }),
  http.get('*/v1/conversations', ({ request }) => {
    const user_id = actorId(request)
    if (!user_id) return unauthorized()
    return HttpResponse.json({ items: conversationsFor(user_id), next_cursor: null })
  }),
  http.get('*/v1/conversations/:id/messages', ({ request, params }) => {
    const user_id = actorId(request)
    if (!user_id) return unauthorized()
    const rows = messagesForConversation(String(params.id), user_id)
    if (!rows) return HttpResponse.json({ code: 'not_found', title: 'Диалог не найден' }, { status: 404 })
    return HttpResponse.json({
      items: rows.map((item) => ({
        id: item.id,
        conversation_id: item.conversation_id,
        sender_id: item.sender_id,
        body: item.body,
        created_at: item.created_at,
        read_at: item.read_at,
      })),
      next_cursor: null,
    })
  }),
  http.post('*/v1/conversations/:id/read', ({ request, params }) => {
    const user_id = actorId(request)
    if (!user_id) return unauthorized()
    if (!markMockConversationRead(String(params.id), user_id)) {
      return HttpResponse.json({ code: 'not_found', title: 'Диалог не найден' }, { status: 404 })
    }
    return new HttpResponse(null, { status: 204 })
  }),
  http.post('*/v1/conversations/with/:peer_user_id/messages', async ({ request, params }) => {
    const user_id = actorId(request)
    if (!user_id) return unauthorized()
    const peer_user_id = String(params.peer_user_id)
    if (peer_user_id === user_id) return HttpResponse.json({ code: 'validation_failed', title: 'Нельзя написать самому себе' }, { status: 422 })
    if (isRestricted(user_id) || isRestricted(peer_user_id)) return restricted()
    const body = (await request.json()) as { body?: string }
    const text = body.body?.trim() ?? ''
    if (text.length < 1 || text.length > 4000) {
      return HttpResponse.json({ code: 'validation_failed', title: 'Данные не прошли проверку' }, { status: 422 })
    }
    const message = addMockMessage({ sender_id: user_id, recipient_id: peer_user_id, body: text })
    return HttpResponse.json(
      {
        id: message.id,
        conversation_id: message.conversation_id,
        sender_id: message.sender_id,
        body: message.body,
        created_at: message.created_at,
        read_at: message.read_at,
      },
      { status: 201 },
    )
  }),
]
