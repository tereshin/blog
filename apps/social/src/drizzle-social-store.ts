import { and, eq } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { FollowEvent, SocialStore } from './social-store';
import { category_follows, outbox_events, user_follows } from './social-schema';

export class DrizzleSocialStore implements SocialStore {
  private readonly db: NodePgDatabase;

  constructor(database_url: string) {
    const pool = new Pool({ connectionString: database_url });
    this.db = drizzle(pool);
  }

  async followUser(follower_id: string, following_id: string, event: FollowEvent): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(user_follows)
        .where(and(eq(user_follows.follower_id, follower_id), eq(user_follows.following_id, following_id)))
        .limit(1);
      if (existing.length > 0) {
        return false;
      }
      await tx.insert(user_follows).values({ follower_id, following_id });
      await tx.insert(outbox_events).values({
        id: event.id,
        event_type: event.event_type,
        aggregate_id: event.aggregate_id,
        payload: event.payload,
        producer: event.producer,
        event_version: event.event_version,
      });
      return true;
    });
  }

  async unfollowUser(follower_id: string, following_id: string): Promise<void> {
    await this.db
      .delete(user_follows)
      .where(and(eq(user_follows.follower_id, follower_id), eq(user_follows.following_id, following_id)));
  }

  async followCategory(user_id: string, category_id: string): Promise<void> {
    const existing = await this.db
      .select()
      .from(category_follows)
      .where(and(eq(category_follows.user_id, user_id), eq(category_follows.category_id, category_id)))
      .limit(1);
    if (existing.length === 0) {
      await this.db.insert(category_follows).values({ user_id, category_id });
    }
  }

  async unfollowCategory(user_id: string, category_id: string): Promise<void> {
    await this.db
      .delete(category_follows)
      .where(and(eq(category_follows.user_id, user_id), eq(category_follows.category_id, category_id)));
  }

  async followsUser(follower_id: string, following_id: string): Promise<boolean> {
    const rows = await this.db
      .select()
      .from(user_follows)
      .where(and(eq(user_follows.follower_id, follower_id), eq(user_follows.following_id, following_id)))
      .limit(1);
    return rows.length > 0;
  }

  async followsCategory(user_id: string, category_id: string): Promise<boolean> {
    const rows = await this.db
      .select()
      .from(category_follows)
      .where(and(eq(category_follows.user_id, user_id), eq(category_follows.category_id, category_id)))
      .limit(1);
    return rows.length > 0;
  }
}
