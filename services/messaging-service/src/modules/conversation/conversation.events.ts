import { createIdempotentConsumer } from '@blog/broker'
import type { BrokerClient, Database, EventHandler, RunningConsumer } from '@blog/broker'
import { ProfileUpdatedV1, UserCreatedV1, UserRestrictedV1 } from '@blog/contracts'
import type { Logger } from '@blog/logger'
import type { ConversationRepository } from './conversation.repository.ts'

/** Копия участника: имя и аватар из профиля, ограничение — из identity. */
export function createUsersCopyHandler(repository: ConversationRepository): EventHandler {
  return async (tx, event) => {
    switch (event.name) {
      case 'identity.user.created': {
        const parsed = UserCreatedV1.parse(event)
        await repository.upsertUser(tx, {
          user_id: parsed.user_id,
          display_name: parsed.display_name,
          is_restricted: parsed.is_restricted,
        })
        return
      }
      case 'identity.user.restricted': {
        const parsed = UserRestrictedV1.parse(event)
        await repository.upsertUser(tx, { user_id: parsed.user_id, is_restricted: parsed.is_restricted })
        return
      }
      case 'content.profile.updated': {
        const parsed = ProfileUpdatedV1.parse(event)
        await repository.upsertUser(tx, {
          user_id: parsed.user_id,
          display_name: parsed.display_name,
          avatar_url: parsed.avatar_url,
          slug: parsed.slug,
        })
        return
      }
      default:
        return
    }
  }
}

export type MessagingConsumerDeps = {
  db: Database
  broker: BrokerClient
  logger: Logger
  repository: ConversationRepository
}

const SUBSCRIPTIONS = [
  { durable: 'messaging-users', subject: 'identity.user.>' },
  { durable: 'messaging-profiles', subject: 'content.profile.updated' },
] as const

/** Запускает потребителей копий участников. Каждый durable пишет свою строку в `processed_events`. */
export async function startMessagingConsumers(deps: MessagingConsumerDeps): Promise<RunningConsumer> {
  const handler = createUsersCopyHandler(deps.repository)
  const running = await Promise.all(SUBSCRIPTIONS.map((item) => createIdempotentConsumer({ ...deps, ...item, handler })))
  return { stop: async () => void (await Promise.all(running.map((consumer) => consumer.stop()))) }
}
