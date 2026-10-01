import {
  OutboxRelay,
  type OutboxAlert,
  type OutboxPublisher,
  type OutboxRow,
  type OutboxSource,
} from '@blog/rabbitmq';
import { asc, eq, isNull } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { outbox_events } from './social-schema';

class SocialOutboxSource implements OutboxSource {
  readonly schema_name = 'social';
  private readonly db: NodePgDatabase;

  constructor(database_url: string) {
    this.db = drizzle(new Pool({ connectionString: database_url }));
  }

  async oldestUnpublished(): Promise<OutboxRow | null> {
    const rows = await this.db
      .select()
      .from(outbox_events)
      .where(isNull(outbox_events.published_at))
      .orderBy(asc(outbox_events.created_at))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      event_type: row.event_type,
      aggregate_id: row.aggregate_id,
      payload: row.payload as Record<string, unknown>,
      correlation_id: row.correlation_id,
      causation_id: row.causation_id,
      producer: row.producer,
      event_version: row.event_version,
      created_at: row.created_at,
      published_at: row.published_at,
    };
  }

  async markPublished(id: string, published_at: string): Promise<void> {
    await this.db.update(outbox_events).set({ published_at }).where(eq(outbox_events.id, id));
  }
}

export function createSocialOutboxRelay(
  database_url: string,
  publisher: OutboxPublisher,
  alert: OutboxAlert,
): OutboxRelay {
  return new OutboxRelay({
    schema_name: 'social',
    source: new SocialOutboxSource(database_url),
    publisher,
    alert,
    now: () => Date.now(),
    max_attempts: 5,
    base_delay_ms: 100,
  });
}
