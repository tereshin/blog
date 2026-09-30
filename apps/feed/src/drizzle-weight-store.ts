import { eq } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { seed_weights, type PopularWeights } from './feed-types';
import { popular_weights } from './feed-schema';
import type { WeightStore } from './weight-store';

export class DrizzleWeightStore implements WeightStore {
  private readonly db: NodePgDatabase;

  constructor(database_url: string) {
    const pool = new Pool({ connectionString: database_url });
    this.db = drizzle(pool);
  }

  async read(): Promise<PopularWeights> {
    const rows = await this.db
      .select()
      .from(popular_weights)
      .where(eq(popular_weights.id, seed_weights.id))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return { ...seed_weights };
    }
    return {
      id: row.id,
      views_weight: row.views_weight,
      likes_weight: row.likes_weight,
      comments_weight: row.comments_weight,
      bookmarks_weight: row.bookmarks_weight,
      age_decay: row.age_decay,
    };
  }

  async save(weights: PopularWeights): Promise<void> {
    await this.db
      .update(popular_weights)
      .set({
        views_weight: weights.views_weight,
        likes_weight: weights.likes_weight,
        comments_weight: weights.comments_weight,
        bookmarks_weight: weights.bookmarks_weight,
        age_decay: weights.age_decay,
      })
      .where(eq(popular_weights.id, weights.id));
  }
}
