import { and, eq } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { EngagementStore, LikeEvent, LikeState } from './engagement-store';
import {
  article_likes,
  article_stats,
  bookmarks,
  comment_like_counts,
  comment_likes,
  outbox_events,
} from './engagement-schema';

export class DrizzleEngagementStore implements EngagementStore {
  private readonly db: NodePgDatabase;

  constructor(database_url: string) {
    const pool = new Pool({ connectionString: database_url });
    this.db = drizzle(pool);
  }

  async toggleArticleLike(input: {
    article_id: string;
    user_id: string;
    event: LikeEvent;
  }): Promise<LikeState> {
    return this.db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(article_likes)
        .where(and(eq(article_likes.article_id, input.article_id), eq(article_likes.user_id, input.user_id)))
        .limit(1);
      const stats = await tx
        .select()
        .from(article_stats)
        .where(eq(article_stats.article_id, input.article_id))
        .limit(1);
      const current = stats[0]?.like_count ?? 0;
      const liked = existing.length === 0;
      const like_count = liked ? current + 1 : Math.max(0, current - 1);
      if (liked) {
        await tx.insert(article_likes).values({ article_id: input.article_id, user_id: input.user_id });
      } else {
        await tx
          .delete(article_likes)
          .where(and(eq(article_likes.article_id, input.article_id), eq(article_likes.user_id, input.user_id)));
      }
      if (stats[0]) {
        await tx
          .update(article_stats)
          .set({ like_count })
          .where(eq(article_stats.article_id, input.article_id));
      } else {
        await tx.insert(article_stats).values({
          article_id: input.article_id,
          like_count,
          view_count: 0,
          bookmark_count: 0,
        });
      }
      await tx.insert(outbox_events).values({
        id: input.event.id,
        event_type: liked ? 'engagement.article.liked' : 'engagement.article.unliked',
        aggregate_id: input.article_id,
        payload: { article_id: input.article_id, user_id: input.user_id, like_count },
        producer: 'engagement',
        event_version: 1,
      });
      return { liked, like_count };
    });
  }

  async toggleCommentLike(input: { comment_id: string; user_id: string }): Promise<LikeState> {
    return this.db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(comment_likes)
        .where(and(eq(comment_likes.comment_id, input.comment_id), eq(comment_likes.user_id, input.user_id)))
        .limit(1);
      const stats = await tx
        .select()
        .from(comment_like_counts)
        .where(eq(comment_like_counts.comment_id, input.comment_id))
        .limit(1);
      const current = stats[0]?.like_count ?? 0;
      const liked = existing.length === 0;
      const like_count = liked ? current + 1 : Math.max(0, current - 1);
      if (liked) {
        await tx.insert(comment_likes).values({ comment_id: input.comment_id, user_id: input.user_id });
      } else {
        await tx
          .delete(comment_likes)
          .where(and(eq(comment_likes.comment_id, input.comment_id), eq(comment_likes.user_id, input.user_id)));
      }
      if (stats[0]) {
        await tx
          .update(comment_like_counts)
          .set({ like_count })
          .where(eq(comment_like_counts.comment_id, input.comment_id));
      } else {
        await tx.insert(comment_like_counts).values({ comment_id: input.comment_id, like_count });
      }
      return { liked, like_count };
    });
  }

  async addBookmark(input: { user_id: string; article_id: string }): Promise<void> {
    await this.db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(bookmarks)
        .where(and(eq(bookmarks.user_id, input.user_id), eq(bookmarks.article_id, input.article_id)))
        .limit(1);
      if (existing.length > 0) {
        return;
      }
      await tx.insert(bookmarks).values(input);
      const stats = await tx
        .select()
        .from(article_stats)
        .where(eq(article_stats.article_id, input.article_id))
        .limit(1);
      const bookmark_count = (stats[0]?.bookmark_count ?? 0) + 1;
      if (stats[0]) {
        await tx.update(article_stats).set({ bookmark_count }).where(eq(article_stats.article_id, input.article_id));
      } else {
        await tx.insert(article_stats).values({
          article_id: input.article_id,
          like_count: 0,
          view_count: 0,
          bookmark_count,
        });
      }
    });
  }

  async removeBookmark(input: { user_id: string; article_id: string }): Promise<void> {
    await this.db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(bookmarks)
        .where(and(eq(bookmarks.user_id, input.user_id), eq(bookmarks.article_id, input.article_id)))
        .limit(1);
      if (existing.length === 0) {
        return;
      }
      await tx
        .delete(bookmarks)
        .where(and(eq(bookmarks.user_id, input.user_id), eq(bookmarks.article_id, input.article_id)));
      const stats = await tx
        .select()
        .from(article_stats)
        .where(eq(article_stats.article_id, input.article_id))
        .limit(1);
      if (!stats[0]) {
        return;
      }
      await tx
        .update(article_stats)
        .set({ bookmark_count: Math.max(0, stats[0].bookmark_count - 1) })
        .where(eq(article_stats.article_id, input.article_id));
    });
  }

  async listBookmarks(user_id: string): Promise<string[]> {
    const rows = await this.db.select().from(bookmarks).where(eq(bookmarks.user_id, user_id));
    return rows.map((row) => row.article_id);
  }
}
