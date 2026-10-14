import { createIdempotentConsumer } from '@blog/broker'
import type { BrokerClient, Database, OutboxEvent, RunningConsumer } from '@blog/broker'
import { ProfileUpdatedV1, UserCreatedV1, UserRestrictedV1 } from '@blog/contracts'
import type { Logger } from '@blog/logger'
import type { UsersCopyPort } from './conversation.types.ts'

export type ConversationConsumerDeps = {
  db: Database
  broker: BrokerClient
  logger: Logger
}

const SUBSCRIPTIONS = [
  { durable: 'messaging-users', subject: 'identity.user.>' },
  { durable: 'messaging-profiles', subject: 'content.profile.updated' },
] as const

/** Потребители копий участников: имя и аватар из профиля, ограничение — из identity. */
export class ConversationEvents {
  constructor(private readonly users_copy: UsersCopyPort<Database>) {}

  readonly handle = async (tx: Database, event: OutboxEvent): Promise<void> => {
    switch (event.name) {
      case 'identity.user.created': {
        const parsed = UserCreatedV1.parse(event)
        await this.users_copy.upsertUser(tx, {
          user_id: parsed.user_id,
          display_name: parsed.display_name,
          is_restricted: parsed.is_restricted,
        })
        return
      }
      case 'identity.user.restricted': {
        const parsed = UserRestrictedV1.parse(event)
        await this.users_copy.upsertUser(tx, { user_id: parsed.user_id, is_restricted: parsed.is_restricted })
        return
      }
      case 'content.profile.updated': {
        const parsed = ProfileUpdatedV1.parse(event)
        await this.users_copy.upsertUser(tx, {
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

  /** Каждый durable пишет свою строку в `processed_events`. */
  async start(deps: ConversationConsumerDeps): Promise<RunningConsumer> {
    const running = await Promise.all(SUBSCRIPTIONS.map((item) => createIdempotentConsumer({ ...deps, ...item, handler: this.handle })))
    return { stop: async () => void (await Promise.all(running.map((consumer) => consumer.stop()))) }
  }
}
