import { eq } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { media_objects } from './media-schema';
import type { MediaObject, MediaStore } from './media-service';

export class DrizzleMediaStore implements MediaStore {
  private readonly db: NodePgDatabase;

  constructor(database_url: string) {
    const pool = new Pool({ connectionString: database_url });
    this.db = drizzle(pool);
  }

  async insert(object: MediaObject): Promise<void> {
    await this.db.insert(media_objects).values({
      id: object.id,
      owner_user_id: object.owner_user_id,
      object_key: object.object_key,
      content_type: object.content_type,
      status: object.status,
    });
  }

  async findById(media_id: string): Promise<MediaObject | null> {
    const rows = await this.db
      .select()
      .from(media_objects)
      .where(eq(media_objects.id, media_id))
      .limit(1);
    const row = rows[0];
    if (!row || (row.status !== 'pending' && row.status !== 'ready')) {
      return null;
    }
    return {
      id: row.id,
      owner_user_id: row.owner_user_id,
      object_key: row.object_key,
      content_type: row.content_type,
      status: row.status,
      upload_url: `https://media.local/${row.object_key}?signature=presign`,
    };
  }

  async markReady(media_id: string): Promise<void> {
    await this.db
      .update(media_objects)
      .set({ status: 'ready', completed_at: new Date().toISOString() })
      .where(eq(media_objects.id, media_id));
  }
}
