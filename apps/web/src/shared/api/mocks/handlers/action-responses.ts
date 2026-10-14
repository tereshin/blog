import { HttpResponse } from 'msw'
import { currentMockAuthor } from './articles-store.ts'
import session_fixtures from '../fixtures/session.json'

export function sumCounts(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, count) => sum + count, 0)
}

export function unauthorized() {
  return HttpResponse.json({ code: 'unauthorized', title: 'Требуется вход', status: 401 }, { status: 401 })
}

export function restricted() {
  return HttpResponse.json({ code: 'restricted', title: 'Действие недоступно: участник ограничен', status: 403 }, { status: 403 })
}

export function emitLive(type: string, fields: { article_id?: string; notification_id?: string; comment_id?: string }): void {
  const events = (window as Window & { mockEvents?: { emit: (frame: { type: string }) => void } }).mockEvents
  events?.emit({ type, ...fields })
}

export function actorOf(request: Request) {
  if (request.headers.get('x-mock-actor') === 'member') {
    const session = session_fixtures.member
    return { id: session.user.id, can_publish: session.user.can_publish, is_restricted: session.user.is_restricted, display_name: session.profile.display_name, slug: session.profile.slug }
  }
  return currentMockAuthor()
}

export function emptyCounts(): Record<string, number> {
  return { laugh: 0, heart: 0, thumb: 0, fire: 0 }
}
