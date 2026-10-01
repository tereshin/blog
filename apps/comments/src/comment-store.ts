export type CommentRecord = {
  id: string;
  article_id: string;
  author_id: string;
  parent_id: string | null;
  root_id: string;
  depth: number;
  body: string;
  status: 'visible' | 'hidden';
  mentioned_user_ids: string[];
  like_count: number;
  flat: boolean;
};

export type CommentEvent = {
  id: string;
  event_type: 'comments.comment.created' | 'comments.comment.hidden';
  aggregate_id: string;
  payload: {
    comment_id: string;
    article_id: string;
    parent_id?: string | null;
    mentioned_user_ids?: string[];
  };
  producer: 'comments';
  event_version: 1;
};

export interface CommentStore {
  insert(comment: CommentRecord, event: CommentEvent): Promise<void>;
  findById(comment_id: string): Promise<CommentRecord | null>;
  listByArticle(article_id: string): Promise<CommentRecord[]>;
  hide(comment: CommentRecord, event: CommentEvent): Promise<void>;
}
