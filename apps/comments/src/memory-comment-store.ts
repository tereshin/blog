import type { CommentEvent, CommentRecord, CommentStore } from './comment-store';

export class MemoryCommentStore implements CommentStore {
  readonly comments: CommentRecord[] = [];
  readonly outbox: CommentEvent[] = [];
  readonly content_writes: never[] = [];

  async insert(comment: CommentRecord, event: CommentEvent): Promise<void> {
    this.comments.push(structuredClone(comment));
    this.outbox.push(event);
  }

  async findById(comment_id: string): Promise<CommentRecord | null> {
    return this.comments.find((comment) => comment.id === comment_id) ?? null;
  }

  async listByArticle(article_id: string): Promise<CommentRecord[]> {
    return this.comments.filter((comment) => comment.article_id === article_id);
  }

  async hide(comment: CommentRecord, event: CommentEvent): Promise<void> {
    const index = this.comments.findIndex((row) => row.id === comment.id);
    if (index >= 0) {
      this.comments[index] = structuredClone(comment);
    }
    this.outbox.push(event);
  }
}
