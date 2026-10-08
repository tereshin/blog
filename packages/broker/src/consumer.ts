import { and, eq, sql } from 'drizzle-orm'
import { pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { AckPolicy, DeliverPolicy } from '@nats-io/jetstream'
import type { JsMsg } from '@nats-io/jetstream'
import { eventEnvelopeSchema } from '@blog/contracts'
import type { Logger } from '@blog/logger'
import { contextOfEvent, dlqSubject, streamName } from './nats-client.ts'
import type { BrokerClient } from './nats-client.ts'
import type { Database, OutboxEvent } from './outbox.ts'

/** Таблица идемпотентности: событие обработано потребителем один раз. */
export const processed_events = pgTable(
  'processed_events',
  {
    event_id: uuid('event_id').notNull(),
    consumer: text('consumer').notNull(),
    processed_at: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.consumer, table.event_id] })],
)

export type EventHandler = (tx: Database, event: OutboxEvent) => Promise<void>

export type IdempotentConsumerOptions = {
  db: Database
  broker: BrokerClient
  logger: Logger
  /** Имя durable-потребителя; одновременно ключ в `processed_events.consumer`. */
  durable: string
  /** Подписка на имя события или маску: `content.article.published`, `content.>`. */
  subject: string
  handler: EventHandler
  max_in_flight?: number
  /** После стольких доставок событие уходит в DLQ. */
  max_deliver?: number
  on_processed?: (result: { subject: string; outcome: 'ok' | 'duplicate' | 'error'; seconds: number }) => void
}

export type RunningConsumer = { stop: () => Promise<void> }

const DEFAULT_MAX_IN_FLIGHT = 16
const DEFAULT_MAX_DELIVER = 5

function backoffMs(delivery_count: number): number {
  const base = Math.min(30_000, 500 * 2 ** (delivery_count - 1))
  return Math.round(base / 2 + Math.random() * (base / 2))
}

/**
 * Обработка одного сообщения: проверка и запись `processed_events` — в одной транзакции с
 * обработчиком. Повторная доставка с тем же `event_id` не меняет данные.
 * Возвращает `duplicate`, если событие уже обработано.
 */
export async function processEvent(
  db: Database,
  consumer: string,
  event: OutboxEvent,
  handler: EventHandler,
): Promise<'ok' | 'duplicate'> {
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(processed_events)
      .values({ event_id: event.event_id, consumer })
      .onConflictDoNothing()
      .returning({ event_id: processed_events.event_id })
    if (inserted.length === 0) return 'duplicate'
    await handler(tx, event)
    return 'ok'
  })
}

export async function wasProcessed(db: Database, consumer: string, event_id: string): Promise<boolean> {
  const rows = await db
    .select({ n: sql<number>`1` })
    .from(processed_events)
    .where(and(eq(processed_events.consumer, consumer), eq(processed_events.event_id, event_id)))
  return rows.length > 0
}

export async function createIdempotentConsumer(options: IdempotentConsumerOptions): Promise<RunningConsumer> {
  const { broker, logger } = options
  const context = contextOfEvent(options.subject)
  if (!context) throw new Error(`Неизвестный контекст события в подписке: ${options.subject}`)
  const stream = streamName(context)
  const max_deliver = options.max_deliver ?? DEFAULT_MAX_DELIVER

  await broker.jsm.consumers.add(stream, {
    durable_name: options.durable,
    filter_subject: options.subject,
    ack_policy: AckPolicy.Explicit,
    deliver_policy: DeliverPolicy.All,
    max_deliver,
    max_ack_pending: options.max_in_flight ?? DEFAULT_MAX_IN_FLIGHT,
  })
  const consumer = await broker.js.consumers.get(stream, options.durable)
  const messages = await consumer.consume({ max_messages: options.max_in_flight ?? DEFAULT_MAX_IN_FLIGHT })

  const handleMessage = async (msg: JsMsg): Promise<void> => {
    const started = process.hrtime.bigint()
    const finish = (outcome: 'ok' | 'duplicate' | 'error'): void =>
      options.on_processed?.({
        subject: msg.subject,
        outcome,
        seconds: Number(process.hrtime.bigint() - started) / 1e9,
      })
    try {
      const envelope = eventEnvelopeSchema.loose().safeParse(msg.json())
      if (!envelope.success) {
        // Сообщение, которое никогда не разберётся: в DLQ без повторов.
        await broker.js.publish(dlqSubject(msg.subject), msg.data)
        msg.term('невалидный конверт события')
        finish('error')
        return
      }
      const outcome = await processEvent(options.db, options.durable, envelope.data, options.handler)
      msg.ack()
      finish(outcome)
    } catch (error) {
      finish('error')
      if (msg.info.deliveryCount >= max_deliver) {
        logger.error({ err: error, subject: msg.subject }, 'потребитель: исчерпаны попытки, событие уходит в DLQ')
        await broker.js.publish(dlqSubject(msg.subject), msg.data)
        msg.term('исчерпаны попытки')
        return
      }
      logger.warn({ err: error, subject: msg.subject }, 'потребитель: ошибка обработки, повтор')
      msg.nak(backoffMs(msg.info.deliveryCount))
    }
  }

  const loop = (async () => {
    for await (const msg of messages) {
      await handleMessage(msg)
    }
  })()

  return {
    stop: async () => {
      await messages.close()
      await loop
    },
  }
}
