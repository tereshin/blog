import { SessionRevokedV1 } from '@blog/contracts'
import type { Logger } from '@blog/logger'
import type { NatsConnection } from '@nats-io/transport-node'
import type { SessionService } from './session.service.ts'

export type RevocationHandler = (event: SessionRevokedV1) => void

/** `identity.session.revoked`: сбросить кэш сессий и закрыть потоки события этого участника. */
export function subscribeSessionRevocations(
  nc: NatsConnection,
  sessions: SessionService,
  logger: Logger,
  on_revoked: RevocationHandler,
): { stop: () => void } {
  const subscription = nc.subscribe('identity.session.revoked')
  void (async () => {
    for await (const message of subscription) {
      const parsed = SessionRevokedV1.safeParse(message.json())
      if (!parsed.success) {
        logger.warn('identity.session.revoked: событие не прошло проверку')
        continue
      }
      sessions.invalidate(parsed.data.session_ids)
      on_revoked(parsed.data)
    }
  })()
  return { stop: () => subscription.unsubscribe() }
}
