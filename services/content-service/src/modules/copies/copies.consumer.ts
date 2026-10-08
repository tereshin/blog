import { createIdempotentConsumer } from '@blog/broker'
import type { BrokerClient, Database, EventHandler, RunningConsumer } from '@blog/broker'
import { UserCreatedV1, UserRestrictedV1, UserUpdatedV1 } from '@blog/contracts'
import type { Logger } from '@blog/logger'
import { copiesRepository } from './copies.repository.ts'
import type { UserCopy } from './copies.repository.ts'

type CopiesRepository = typeof copiesRepository
type UserSnapshot = Pick<UserCreatedV1, 'user_id' | 'public_number' | 'role' | 'can_publish' | 'is_restricted' | 'created_at'>

function toUserCopy(event: UserSnapshot): UserCopy {
  return {
    user_id: event.user_id,
    public_number: event.public_number,
    role: event.role,
    can_publish: event.can_publish,
    is_restricted: event.is_restricted,
    created_at: new Date(event.created_at),
  }
}

/** Применяет одно событие участника к копиям. Чужие события пропускает. */
export function createCopiesHandler(repository: CopiesRepository = copiesRepository): EventHandler {
  return async (tx: Database, event) => {
    switch (event.name) {
      case 'identity.user.created': {
        const parsed = UserCreatedV1.parse(event)
        await repository.upsertUser(tx, toUserCopy(parsed))
        await repository.createProfileIfMissing(tx, parsed.user_id, parsed.display_name)
        return
      }
      case 'identity.user.updated':
        await repository.upsertUser(tx, toUserCopy(UserUpdatedV1.parse(event)))
        return
      case 'identity.user.restricted':
        await repository.upsertUser(tx, toUserCopy(UserRestrictedV1.parse(event)))
        return
      default:
        return
    }
  }
}

export type CopiesConsumerDeps = { db: Database; broker: BrokerClient; logger: Logger }

/** Запускает потребителя копий участника (durable, своя запись в `processed_events`). */
export async function startCopiesConsumers(deps: CopiesConsumerDeps): Promise<RunningConsumer> {
  return createIdempotentConsumer({ ...deps, durable: 'content-copies-users', subject: 'identity.user.>', handler: createCopiesHandler() })
}
