import type { NatsConnection } from '@nats-io/transport-node'
import type { BrokerSubscription, EventSourcePort } from '../../modules/events/index.ts'

/** Подписки core NATS как порт источника событий: модули не знают про клиент брокера. */
export class NatsEventSource implements EventSourcePort {
  constructor(private readonly nc: NatsConnection) {}

  subscribe(subject: string): BrokerSubscription {
    return this.nc.subscribe(subject)
  }
}
