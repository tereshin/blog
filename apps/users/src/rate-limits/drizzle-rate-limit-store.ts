import { eq } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { rate_limit_settings } from '../profile/users-schema';
import type { RateLimitSetting, RateLimitStore } from './rate-limit-store';

export class DrizzleRateLimitStore implements RateLimitStore {
  private readonly db: NodePgDatabase;

  constructor(database_url: string) {
    const pool = new Pool({ connectionString: database_url });
    this.db = drizzle(pool);
  }

  async list(): Promise<RateLimitSetting[]> {
    const rows = await this.db.select().from(rate_limit_settings);
    return rows.map((row) => ({
      action: row.action,
      max_count: row.max_count,
      window_seconds: row.window_seconds,
      updated_at: row.updated_at,
    }));
  }

  async find(action: string): Promise<RateLimitSetting | null> {
    const rows = await this.db
      .select()
      .from(rate_limit_settings)
      .where(eq(rate_limit_settings.action, action));
    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      action: row.action,
      max_count: row.max_count,
      window_seconds: row.window_seconds,
      updated_at: row.updated_at,
    };
  }

  async update(
    action: string,
    max_count: number,
    window_seconds: number,
    updated_at: string,
  ): Promise<RateLimitSetting | null> {
    const rows = await this.db
      .update(rate_limit_settings)
      .set({ max_count, window_seconds, updated_at })
      .where(eq(rate_limit_settings.action, action))
      .returning();
    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      action: row.action,
      max_count: row.max_count,
      window_seconds: row.window_seconds,
      updated_at: row.updated_at,
    };
  }
}
