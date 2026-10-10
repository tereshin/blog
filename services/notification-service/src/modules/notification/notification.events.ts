import { NotificationCreatedV1 } from '@blog/contracts'
import { newEventId } from '@blog/broker'

export function notificationCreatedEvent(input: {
  occurred_at: string
  correlation_id: string
  causation_id: string | null
  notification_id: string
  user_id: string
  kind: 'comment' | 'reply' | 'reaction' | 'message' | 'moderation' | 'mention'
}): NotificationCreatedV1 {
  return NotificationCreatedV1.parse({
    event_id: newEventId(),
    name: 'notification.notification.created',
    occurred_at: input.occurred_at,
    correlation_id: input.correlation_id,
    causation_id: input.causation_id,
    version: 1,
    notification_id: input.notification_id,
    user_id: input.user_id,
    kind: input.kind,
  })
}
