import { eq } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { comment_mentions, comments_table, outbox_events } from './comments-schema';
import type { CommentEvent, CommentRecord, CommentStore } from './comment-store';

export class DrizzleCommentStore implements CommentStore {
  private readonly db: NodePgDatabase;

  constructor(database_url: string) {
    const pool = new Pool({ connectionString: database_url });
    this.db = drizzle(pool);
  }

  async insert(comment: CommentRecord, event: CommentEvent): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(comments_table).values({
        id: comment.id,
        article_id: comment.article_id,
        author_id: comment.author_id,
        parent_id: comment.parent_id,
        root_id: comment.root_id,
        depth: comment.depth,
        body: comment.body,
        status: comment.status,
      });
      if (comment.mentioned_user_ids.length > 0) {
        await tx.insert(comment_mentions).values(
          comment.mentioned_user_ids.map((mentioned_user_id) => ({
            comment_id: comment.id,
            mentioned_user_id,
          })),
        );
      }
      await tx.insert(outbox_events).values({
        id: event.id,
        event_type: event.event_type,
        aggregate_id: event.aggregate_id,
        payload: event.payload,
        producer: event.producer,
        event_version: event.event_version,
      });
    });
  }

  async findById(comment_id: string): Promise<CommentRecord | null> {
    const rows = await this.db
      .select()
      .from(comments_table)
      .where(eq(comments_table.id, comment_id))
      .limit(1);
    const row = rows[0];
    if (!row || (row.status !== 'visible' && row.status !== 'hidden')) {
      return null;
    }
    const mentions = await this.db
      .select()
      .from(comment_mentions)
      .where(eq(comment_mentions.comment_id, comment_id));
    return {
      id: row.id,
      article_id: row.article_id,
      author_id: row.author_id,
      parent_id: row.parent_id,
      root_id: row.root_id,
      depth: row.depth,
      body: row.body,
      status: row.status,
      mentioned_user_ids: mentions.map((mention) => mention.mentioned_user_id),
      like_count: 0,
      flat: row.depth > 3,
    };
  }

  async listByArticle(article_id: string): Promise<CommentRecord[]> {
    const rows = await this.db
      .select()
      .from(comments_table)
      .where(eq(comments_table.article_id, article_id));
    const comments: CommentRecord[] = [];
    for (const row of rows) {
      const found = await this.findById(row.id);
      if (found) {
        comments.push(found);
      }
    }
    return comments;
  }
}
