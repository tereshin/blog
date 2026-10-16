import { createIdempotentConsumer } from '@blog/broker'
import type { EventHandler, RunningConsumer } from '@blog/broker'
import { UserRestrictedV1 } from '@blog/contracts'
import { copiesRepository } from './copies.repository.ts'
import type { CopiesConsumerDeps } from './copies.consumer.ts'

/** Own durable replays tombstones acknowledged by older copies consumers. */
export const DELETED_USERS_CONSUMER = 'content-copies-deleted-users-v1'

export const applyDeletedUser: EventHandler = async (tx, event) => {
  const user = UserRestrictedV1.parse(event)
  if (!user.is_deleted) return
  await copiesRepository.upsertUser(tx, {
    user_id: user.user_id,
    public_number: user.public_number,
    role: user.role,
    can_publish: false,
    is_restricted: true,
    is_deleted: true,
    created_at: new Date(user.created_at),
  })
}

export function startDeletedUsersConsumer(deps: CopiesConsumerDeps): Promise<RunningConsumer> {
  return createIdempotentConsumer({
    ...deps,
    durable: DELETED_USERS_CONSUMER,
    subject: 'identity.user.restricted',
    handler: applyDeletedUser,
  })
}
