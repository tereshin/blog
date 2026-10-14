import { SessionRevokedV1 } from '@blog/contracts'
import { newEventId } from '@blog/broker'

/** Событие отзыва сессий — то же, что пишут выход и ограничение. */
export function sessionRevokedEvent(input: {
  event_id?: string
  occurred_at?: string
  correlation_id: string
  session_ids: string[]
  user_id: string
}): SessionRevokedV1 {
  return SessionRevokedV1.parse({
    event_id: input.event_id ?? newEventId(),
    name: 'identity.session.revoked',
    occurred_at: input.occurred_at ?? new Date().toISOString(),
    correlation_id: input.correlation_id,
    causation_id: null,
    version: 1,
    session_ids: input.session_ids,
    user_id: input.user_id,
  })
}
