import { jetstream, jetstreamManager, RetentionPolicy, StorageType } from '@nats-io/jetstream'
import type { JetStreamClient, JetStreamManager } from '@nats-io/jetstream'
import { connect } from '@nats-io/transport-node'
import type { NatsConnection } from '@nats-io/transport-node'

export const EVENT_CONTEXTS = ['content', 'discussion', 'identity', 'messaging', 'notification'] as const
export type EventContext = (typeof EVENT_CONTEXTS)[number]

/** Потоки JetStream: `<context>-events` на `<context>.>`, DLQ — `<context>-dlq` на `dlq.<context>.>`. */
export function streamName(context: EventContext): string {
  return `${context}-events`
}

export function dlqStreamName(context: EventContext): string {
  return `${context}-dlq`
}

export function dlqSubject(event_name: string): string {
  return `dlq.${event_name}`
}

export function contextOfEvent(event_name: string): EventContext | null {
  const context = event_name.split('.')[0]
  return EVENT_CONTEXTS.find((item) => item === context) ?? null
}

export type BrokerClient = {
  nc: NatsConnection
  js: JetStreamClient
  jsm: JetStreamManager
  /** Ждёт, пока соединение и JetStream ответят: для `/health/ready`. */
  isReady: () => boolean
  close: () => Promise<void>
}

export type ConnectBrokerOptions = {
  url: string
  name: string
  /** Создать потоки, если их нет (идемпотентно). У сервисов-потребителей — да. */
  ensure_streams?: boolean
}

export async function connectBroker(options: ConnectBrokerOptions): Promise<BrokerClient> {
  const nc = await connect({ servers: options.url, name: options.name, maxReconnectAttempts: -1 })
  const js = jetstream(nc)
  const jsm = await jetstreamManager(nc)
  if (options.ensure_streams ?? true) await ensureStreams(jsm)
  return {
    nc,
    js,
    jsm,
    isReady: () => !nc.isClosed() && !nc.isDraining(),
    close: () => nc.drain(),
  }
}

async function ensureStream(jsm: JetStreamManager, name: string, subjects: string[]): Promise<void> {
  const config = {
    name,
    subjects,
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    // Окно дедупликации по msgID: ретраи outbox-релея не создают дубликатов.
    duplicate_window: 2 * 60 * 1e9,
  }
  try {
    await jsm.streams.info(name)
    await jsm.streams.update(name, config)
  } catch {
    await jsm.streams.add(config)
  }
}

export async function ensureStreams(jsm: JetStreamManager): Promise<void> {
  for (const context of EVENT_CONTEXTS) {
    await ensureStream(jsm, streamName(context), [`${context}.>`])
    await ensureStream(jsm, dlqStreamName(context), [`dlq.${context}.>`])
  }
}
