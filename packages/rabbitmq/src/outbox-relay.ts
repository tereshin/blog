import { retryDelayMs } from './settle-delivery';

export type OutboxRow = {
  id: string;
  event_type: string;
  aggregate_id: string;
  payload: Record<string, unknown>;
  correlation_id: string | null;
  causation_id: string | null;
  producer: string;
  event_version: number;
  created_at: string;
  published_at: string | null;
};

export type OutboxEnvelope = {
  eventId: string;
  eventType: string;
  eventVersion: number;
  timestamp: string;
  producer: string;
  correlationId: string | null;
  causationId: string | null;
  data: Record<string, unknown>;
};

export interface OutboxSource {
  schema_name: string;
  oldestUnpublished(): Promise<OutboxRow | null>;
  markPublished(id: string, published_at: string): Promise<void>;
}

export interface OutboxPublisher {
  confirm(envelope: OutboxEnvelope): Promise<void>;
  deadLetter(envelope: OutboxEnvelope): Promise<void>;
}

export interface OutboxAlert {
  lag(input: { schema_name: string; oldest_created_at: string; lag_ms: number }): void;
}

const lag_limit_ms = 500;

export class OutboxRelay {
  private readonly attempts = new Map<string, number>();
  private readonly not_before = new Map<string, number>();

  constructor(
    private readonly options: {
      schema_name: string;
      source: OutboxSource;
      publisher: OutboxPublisher;
      alert: OutboxAlert;
      now: () => number;
      max_attempts: number;
      base_delay_ms: number;
    },
  ) {}

  get schema_name(): string {
    return this.options.schema_name;
  }

  async tick(): Promise<void> {
    if (this.options.source.schema_name !== this.options.schema_name) {
      throw new Error('OUTBOX_SCHEMA');
    }
    const row = await this.options.source.oldestUnpublished();
    if (!row) {
      return;
    }
    const now_ms = this.options.now();
    const lag_ms = now_ms - Date.parse(row.created_at);
    if (lag_ms > lag_limit_ms) {
      this.options.alert.lag({
        schema_name: this.options.schema_name,
        oldest_created_at: row.created_at,
        lag_ms,
      });
    }
    const wait_until = this.not_before.get(row.id) ?? 0;
    if (now_ms < wait_until) {
      return;
    }
    const attempt = (this.attempts.get(row.id) ?? 0) + 1;
    this.attempts.set(row.id, attempt);
    const envelope = toEnvelope(row);
    try {
      if (attempt > this.options.max_attempts) {
        await this.options.publisher.deadLetter(envelope);
      } else {
        await this.options.publisher.confirm(envelope);
      }
      await this.options.source.markPublished(row.id, new Date(now_ms).toISOString());
      this.attempts.delete(row.id);
      this.not_before.delete(row.id);
    } catch {
      this.not_before.set(row.id, now_ms + retryDelayMs(attempt, this.options.base_delay_ms));
    }
  }
}

function toEnvelope(row: OutboxRow): OutboxEnvelope {
  return {
    eventId: row.id,
    eventType: row.event_type,
    eventVersion: row.event_version,
    timestamp: row.created_at,
    producer: row.producer,
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    data: row.payload,
  };
}
