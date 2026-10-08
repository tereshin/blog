export type SessionEventName = 'expired' | 'logged_out' | 'login_required'

type SessionEventHandler = () => void

/** Типизированный эмиттер событий сессии: http-клиент сообщает, остальной код подписывается. */
export function createSessionEvents() {
  const handlers_by_event: Record<SessionEventName, Set<SessionEventHandler>> = {
    expired: new Set(),
    logged_out: new Set(),
    login_required: new Set(),
  }
  return {
    on(event: SessionEventName, handler: SessionEventHandler): () => void {
      handlers_by_event[event].add(handler)
      return () => {
        handlers_by_event[event].delete(handler)
      }
    },
    emit(event: SessionEventName): void {
      for (const handler of [...handlers_by_event[event]]) handler()
    },
  }
}

export const sessionEvents = createSessionEvents()
