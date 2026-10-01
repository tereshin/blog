import { sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { article_stats } from './engagement-schema';

export interface ViewDelta {
  takePending(): Promise<Array<{ article_id: string; count: number }>>;
}

export interface ViewCounts {
  add(article_id: string, delta: number): Promise<void>;
}

export class ViewFlush {
  constructor(
    private readonly deltas: ViewDelta,
    private readonly counts: ViewCounts,
  ) {}

  async run(): Promise<void> {
    const rows = await this.deltas.takePending();
    for (const row of rows) {
      await this.counts.add(row.article_id, row.count);
    }
  }
}

export class DrizzleViewCounts implements ViewCounts {
  private readonly db: NodePgDatabase;

  constructor(database_url: string) {
    this.db = drizzle(new Pool({ connectionString: database_url }));
  }

  async add(article_id: string, delta: number): Promise<void> {
    await this.db
      .insert(article_stats)
      .values({
        article_id,
        like_count: 0,
        view_count: delta,
        bookmark_count: 0,
      })
      .onConflictDoUpdate({
        target: article_stats.article_id,
        set: { view_count: sql`${article_stats.view_count} + ${delta}` },
      });
  }
}
