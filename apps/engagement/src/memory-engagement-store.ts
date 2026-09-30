import type { EngagementStore, LikeEvent, LikeState } from './engagement-store';

type Pair = { left: string; right: string };

export class MemoryEngagementStore implements EngagementStore {
  readonly article_likes: Pair[] = [];
  readonly comment_likes: Pair[] = [];
  readonly bookmarks: Pair[] = [];
  readonly article_like_counts = new Map<string, number>();
  readonly comment_like_counts = new Map<string, number>();
  readonly bookmark_counts = new Map<string, number>();
  readonly outbox: LikeEvent[] = [];
  readonly content_writes: never[] = [];

  async toggleArticleLike(input: {
    article_id: string;
    user_id: string;
    event: LikeEvent;
  }): Promise<LikeState> {
    const index = this.article_likes.findIndex(
      (pair) => pair.left === input.article_id && pair.right === input.user_id,
    );
    const current = this.article_like_counts.get(input.article_id) ?? 0;
    if (index >= 0) {
      this.article_likes.splice(index, 1);
      const like_count = Math.max(0, current - 1);
      this.article_like_counts.set(input.article_id, like_count);
      this.outbox.push({ ...input.event, event_type: 'engagement.article.unliked', payload: { ...input.event.payload, like_count } });
      return { liked: false, like_count };
    }
    this.article_likes.push({ left: input.article_id, right: input.user_id });
    const like_count = current + 1;
    this.article_like_counts.set(input.article_id, like_count);
    this.outbox.push({ ...input.event, event_type: 'engagement.article.liked', payload: { ...input.event.payload, like_count } });
    return { liked: true, like_count };
  }

  async toggleCommentLike(input: { comment_id: string; user_id: string }): Promise<LikeState> {
    const index = this.comment_likes.findIndex(
      (pair) => pair.left === input.comment_id && pair.right === input.user_id,
    );
    const current = this.comment_like_counts.get(input.comment_id) ?? 0;
    if (index >= 0) {
      this.comment_likes.splice(index, 1);
      const like_count = Math.max(0, current - 1);
      this.comment_like_counts.set(input.comment_id, like_count);
      return { liked: false, like_count };
    }
    this.comment_likes.push({ left: input.comment_id, right: input.user_id });
    const like_count = current + 1;
    this.comment_like_counts.set(input.comment_id, like_count);
    return { liked: true, like_count };
  }

  async addBookmark(input: { user_id: string; article_id: string }): Promise<void> {
    const exists = this.bookmarks.some(
      (pair) => pair.left === input.user_id && pair.right === input.article_id,
    );
    if (exists) {
      return;
    }
    this.bookmarks.push({ left: input.user_id, right: input.article_id });
    this.bookmark_counts.set(input.article_id, (this.bookmark_counts.get(input.article_id) ?? 0) + 1);
  }

  async removeBookmark(input: { user_id: string; article_id: string }): Promise<void> {
    const index = this.bookmarks.findIndex(
      (pair) => pair.left === input.user_id && pair.right === input.article_id,
    );
    if (index < 0) {
      return;
    }
    this.bookmarks.splice(index, 1);
    this.bookmark_counts.set(
      input.article_id,
      Math.max(0, (this.bookmark_counts.get(input.article_id) ?? 0) - 1),
    );
  }

  async listBookmarks(user_id: string): Promise<string[]> {
    return this.bookmarks.filter((pair) => pair.left === user_id).map((pair) => pair.right);
  }
}
