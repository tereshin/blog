import { eq } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { CommentComplaint, ComplaintStore } from './complaint-store';
import { comment_complaints } from './comments-schema';

export class DrizzleComplaintStore implements ComplaintStore {
  private readonly db: NodePgDatabase;

  constructor(database_url: string) {
    const pool = new Pool({ connectionString: database_url });
    this.db = drizzle(pool);
  }

  async insert(complaint: CommentComplaint): Promise<void> {
    await this.db.insert(comment_complaints).values({
      id: complaint.id,
      comment_id: complaint.comment_id,
      reporter_id: complaint.reporter_id,
      reason: complaint.reason,
      status: complaint.status,
      created_at: complaint.created_at,
    });
  }

  async listOpen(): Promise<CommentComplaint[]> {
    const rows = await this.db
      .select()
      .from(comment_complaints)
      .where(eq(comment_complaints.status, 'open'));
    return rows.map((row) => ({
      id: row.id,
      comment_id: row.comment_id,
      reporter_id: row.reporter_id,
      reason: row.reason,
      status: 'open',
      created_at: row.created_at,
    }));
  }
}
