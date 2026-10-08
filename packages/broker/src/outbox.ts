import { randomUUID } from 'node:crypto'
import { isNull, sql } from 'drizzle-orm'
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres'
import type { PgDatabase } from 'drizzle-orm/pg-core'
import { headers as natsHeaders } from '@nats-io/nats-core'
import type { EventEnvelope } from '@blog/contracts'
import type { Logger } from '@blog/logger'
import type { BrokerClient } from './nats-client.ts'

/**
 * Таблица outbox есть в базе каждого сервиса (миграция сервиса создаёт её с теми же колонками).
 * Событие и запись в БД — одна транзакция; брокер получает событие от `OutboxRelay`.
 */
export const outbox = pgTable('outbox', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  published_at: timestamp('published_at', { withTimezone: true }),
})

/** База или транзакция Drizzle поверх node-postgres — единственного драйвера проекта (@blog/db-kit). */
export type Database = PgDatabase<NodePgQueryResultHKT>
export type OutboxEvent = EventEnvelope & Record<string, unknown>

/** Вызывается внутри `db.transaction`, в той же транзакции, что и запись данных. */
export async function appendToOutbox(tx: Database, event: OutboxEvent): Promise<void> {
  await tx.insert(outbox).values({ id: event.event_id, name: event.name, payload: event })
}

export function newEventId(): string {
  return randomUUID()
}

export type OutboxRelayOptions = {
  db: Database
  broker: BrokerClient
  logger: Logger
  poll_interval_ms?: number
  batch_size?: number
}

const DEFAULT_POLL_MS = 300
const MAX_BATCH = 100

/** Воркер опроса: читает неотправленные события пачкой, публикует, ставит `published_at`. */
export class OutboxRelay {
  private timer: NodeJS.Timeout | null = null
  private is_running = false
  private is_stopped = true
  private readonly poll_interval_ms: number
  private readonly batch_size: number

  constructor(private readonly options: OutboxRelayOptions) {
    this.poll_interval_ms = options.poll_interval_ms ?? DEFAULT_POLL_MS
    this.batch_size = Math.min(options.batch_size ?? MAX_BATCH, MAX_BATCH)
  }

  start(): void {
    if (!this.is_stopped) return
    this.is_stopped = false
    this.schedule()
  }

  async stop(): Promise<void> {
    this.is_stopped = true
    if (this.timer) clearTimeout(this.timer)
    while (this.is_running) await new Promise((resolve) => setTimeout(resolve, 10))
  }

  /** Одна итерация; возвращает число опубликованных событий. Публичный — для тестов. */
  async flushOnce(): Promise<number> {
    const { db, broker } = this.options
    return db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(outbox)
        .where(isNull(outbox.published_at))
        .orderBy(outbox.created_at, outbox.id)
        .limit(this.batch_size)
        .for('update', { skipLocked: true })
      for (const row of rows) {
        const msg_headers = natsHeaders()
        msg_headers.set('Nats-Msg-Id', row.id)
        await broker.js.publish(row.name, JSON.stringify(row.payload), { msgID: row.id, headers: msg_headers })
        await tx.update(outbox).set({ published_at: sql`now()` }).where(sql`${outbox.id} = ${row.id}`)
      }
      return rows.length
    })
  }

  private schedule(): void {
    if (this.is_stopped) return
    this.timer = setTimeout(() => void this.tick(), this.poll_interval_ms)
  }

  private async tick(): Promise<void> {
    this.is_running = true
    try {
      let published = 0
      do {
        published = await this.flushOnce()
      } while (published === this.batch_size && !this.is_stopped)
    } catch (error) {
      this.options.logger.error({ err: error }, 'outbox relay: ошибка публикации, повтор на следующем такте')
    } finally {
      this.is_running = false
      this.schedule()
    }
  }
}
