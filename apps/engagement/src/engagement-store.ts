export type LikeEvent = {
  id: string;
  event_type: 'engagement.article.liked' | 'engagement.article.unliked';
  aggregate_id: string;
  payload: { article_id: string; user_id: string; like_count: number };
  producer: 'engagement';
  event_version: 1;
};

export type LikeState = { liked: boolean; like_count: number };
export type BookmarkState = { bookmarked: boolean };

export interface EngagementStore {
  toggleArticleLike(input: {
    article_id: string;
    user_id: string;
    event: LikeEvent;
  }): Promise<LikeState>;
  toggleCommentLike(input: { comment_id: string; user_id: string }): Promise<LikeState>;
  addBookmark(input: { user_id: string; article_id: string }): Promise<void>;
  removeBookmark(input: { user_id: string; article_id: string }): Promise<void>;
  listBookmarks(user_id: string): Promise<string[]>;
}
