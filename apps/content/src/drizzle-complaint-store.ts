import { and, eq } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { ArticleComplaint, ComplaintStore } from './complaint-store';
import { article_complaints } from './content-schema';

export class DrizzleComplaintStore implements ComplaintStore {
  private readonly db: NodePgDatabase;

  constructor(database_url: string) {
    const pool = new Pool({ connectionString: database_url });
    this.db = drizzle(pool);
  }

  async insert(complaint: ArticleComplaint): Promise<void> {
    await this.db.insert(article_complaints).values({
      id: complaint.id,
      article_id: complaint.article_id,
      reporter_id: complaint.reporter_id,
      reason: complaint.reason,
      status: complaint.status,
      created_at: complaint.created_at,
    });
  }

  async listOpen(): Promise<ArticleComplaint[]> {
    const rows = await this.db
      .select()
      .from(article_complaints)
      .where(eq(article_complaints.status, 'open'));
    return rows.map((row) => ({
      id: row.id,
      article_id: row.article_id,
      reporter_id: row.reporter_id,
      reason: row.reason,
      status: 'open',
      created_at: row.created_at,
    }));
  }

  async dismiss(complaint_id: string, resolution_reason: string): Promise<ArticleComplaint | null> {
    const rows = await this.db
      .update(article_complaints)
      .set({ status: 'dismissed', resolution_reason })
      .where(and(eq(article_complaints.id, complaint_id), eq(article_complaints.status, 'open')))
      .returning();
    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      article_id: row.article_id,
      reporter_id: row.reporter_id,
      reason: row.reason,
      status: 'dismissed',
      created_at: row.created_at,
      resolution_reason: row.resolution_reason,
    };
  }

  async closeOpen(article_id: string): Promise<void> {
    await this.db
      .update(article_complaints)
      .set({ status: 'closed_hidden' })
      .where(and(eq(article_complaints.article_id, article_id), eq(article_complaints.status, 'open')));
  }
}
