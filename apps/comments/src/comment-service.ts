import type { ArticleVisibility } from './article-visibility';
import { CommentError } from './comment-error';
import type { CommentRecord, CommentStore } from './comment-store';
import { uuidV7 } from './uuid-v7';

export class CommentService {
  now: () => Date = () => new Date();

  constructor(
    private readonly store: CommentStore,
    private readonly articles: ArticleVisibility,
  ) {}

  async comment(input: {
    article_id: string;
    author_id: string;
    body: string;
    mentioned_user_ids?: string[];
  }): Promise<CommentRecord> {
    const body = this.requireBody(input.body);
    await this.requireVisible(input.article_id);
    const id = uuidV7(this.now().getTime());
    return this.persist({
      id,
      article_id: input.article_id,
      author_id: input.author_id,
      parent_id: null,
      root_id: id,
      depth: 1,
      body,
      mentioned_user_ids: input.mentioned_user_ids ?? [],
    });
  }

  async reply(input: {
    comment_id: string;
    author_id: string;
    body: string;
    mentioned_user_ids?: string[];
  }): Promise<CommentRecord> {
    const body = this.requireBody(input.body);
    const parent = await this.store.findById(input.comment_id);
    if (!parent) {
      throw new CommentError('COMMENT_NOT_FOUND');
    }
    await this.requireVisible(parent.article_id);
    const depth = parent.depth + 1;
    return this.persist({
      id: uuidV7(this.now().getTime()),
      article_id: parent.article_id,
      author_id: input.author_id,
      parent_id: parent.id,
      root_id: parent.root_id,
      depth,
      body,
      mentioned_user_ids: input.mentioned_user_ids ?? [],
    });
  }

  async list(article_id: string): Promise<CommentRecord[]> {
    return this.store.listByArticle(article_id);
  }

  private requireBody(body: string): string {
    const trimmed = body.trim();
    if (trimmed.length === 0) {
      throw new CommentError('COMMENT_BODY_REQUIRED');
    }
    return trimmed;
  }

  private async requireVisible(article_id: string): Promise<void> {
    if (!(await this.articles.isPublished(article_id))) {
      throw new CommentError('COMMENT_ARTICLE_NOT_VISIBLE');
    }
  }

  private async persist(
    input: Omit<CommentRecord, 'status' | 'like_count' | 'flat'>,
  ): Promise<CommentRecord> {
    const comment: CommentRecord = {
      ...input,
      status: 'visible',
      like_count: 0,
      flat: input.depth > 3,
    };
    await this.store.insert(comment, {
      id: uuidV7(this.now().getTime()),
      event_type: 'comments.comment.created',
      aggregate_id: comment.id,
      payload: {
        comment_id: comment.id,
        article_id: comment.article_id,
        parent_id: comment.parent_id,
        mentioned_user_ids: comment.mentioned_user_ids,
      },
      producer: 'comments',
      event_version: 1,
    });
    return comment;
  }
}
