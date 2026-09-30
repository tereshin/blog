import { eq } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { Notice, NoticeStore, NoticeType } from './notice-store';
import { notifications } from './notifications-schema';

export class DrizzleNoticeStore implements NoticeStore {
  private readonly db: NodePgDatabase;

  constructor(database_url: string) {
    const pool = new Pool({ connectionString: database_url });
    this.db = drizzle(pool);
  }

  async insert(notice: Notice): Promise<boolean> {
    const inserted = await this.db
      .insert(notifications)
      .values(notice)
      .onConflictDoNothing({ target: [notifications.user_id, notifications.source_event_id] })
      .returning({ id: notifications.id });
    return inserted.length > 0;
  }

  async list(user_id: string): Promise<Notice[]> {
    const rows = await this.db.select().from(notifications).where(eq(notifications.user_id, user_id));
    return rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      type: row.type as NoticeType,
      actor_id: row.actor_id,
      entity_type: row.entity_type as Notice['entity_type'],
      entity_id: row.entity_id,
      source_event_id: row.source_event_id,
      created_at: row.created_at,
    }));
  }
}
