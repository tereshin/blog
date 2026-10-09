import { SessionRevokedV1, UserCreatedV1 } from '@blog/contracts'
import { newEventId } from '@blog/broker'
import type { AccountRole } from './auth.types.ts'

/** Событие появления участника — то же, что пишет вход и `bootstrap`. */
export function userCreatedEvent(input: {
  event_id?: string
  occurred_at?: string
  correlation_id: string
  user_id: string
  public_number: number
  role: AccountRole
  can_publish: boolean
  is_restricted: boolean
  created_at: string
  display_name: string
}): UserCreatedV1 {
  return UserCreatedV1.parse({
    event_id: input.event_id ?? newEventId(),
    name: 'identity.user.created',
    occurred_at: input.occurred_at ?? new Date().toISOString(),
    correlation_id: input.correlation_id,
    causation_id: null,
    version: 1,
    user_id: input.user_id,
    public_number: input.public_number,
    role: input.role,
    can_publish: input.can_publish,
    is_restricted: input.is_restricted,
    created_at: input.created_at,
    display_name: input.display_name,
  })
}

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
