import { EngagementError } from './engagement-error';
import type { AccountAccess, KnownComments, PublishedArticles, ViewWindow } from './engagement-ports';
import type { BookmarkState, EngagementStore, LikeEvent, LikeState } from './engagement-store';
import { uuidV7 } from './uuid-v7';

export class EngagementService {
  now: () => Date = () => new Date();

  constructor(
    private readonly store: EngagementStore,
    private readonly articles: PublishedArticles,
    private readonly comments: KnownComments,
    private readonly accounts: AccountAccess,
    private readonly views: ViewWindow,
  ) {}

  async likeArticle(input: { user_id: string | null; article_id: string }): Promise<LikeState> {
    const user_id = this.requireUser(input.user_id);
    await this.requireOpen(user_id, input.article_id);
    const event: LikeEvent = {
      id: uuidV7(this.now().getTime()),
      event_type: 'engagement.article.liked',
      aggregate_id: input.article_id,
      payload: { article_id: input.article_id, user_id, like_count: 0 },
      producer: 'engagement',
      event_version: 1,
    };
    return this.store.toggleArticleLike({
      article_id: input.article_id,
      user_id,
      event,
    });
  }

  async likeComment(input: { user_id: string | null; comment_id: string }): Promise<LikeState> {
    const user_id = this.requireUser(input.user_id);
    if (await this.accounts.isBlocked(user_id)) {
      throw new EngagementError('ACCOUNT_BLOCKED');
    }
    if (!(await this.comments.exists(input.comment_id))) {
      throw new EngagementError('COMMENT_NOT_FOUND');
    }
    return this.store.toggleCommentLike({ comment_id: input.comment_id, user_id });
  }

  async bookmark(input: { user_id: string | null; article_id: string }): Promise<BookmarkState> {
    const user_id = this.requireUser(input.user_id);
    await this.requireOpen(user_id, input.article_id);
    await this.store.addBookmark({ user_id, article_id: input.article_id });
    return { bookmarked: true };
  }

  async removeBookmark(input: { user_id: string | null; article_id: string }): Promise<BookmarkState> {
    const user_id = this.requireUser(input.user_id);
    await this.store.removeBookmark({ user_id, article_id: input.article_id });
    return { bookmarked: false };
  }

  async listBookmarks(user_id: string | null): Promise<string[]> {
    return this.store.listBookmarks(this.requireUser(user_id));
  }

  async recordView(input: {
    article_id: string;
    user_id: string | null;
    viewer_key: string | null;
  }): Promise<{ recorded: boolean }> {
    if (!(await this.articles.isPublished(input.article_id))) {
      throw new EngagementError('ARTICLE_NOT_FOUND');
    }
    const viewer_id = input.user_id ?? input.viewer_key;
    if (!viewer_id) {
      return { recorded: false };
    }
    const recorded = await this.views.claim(input.article_id, viewer_id, this.now().getTime());
    return { recorded };
  }

  private requireUser(user_id: string | null): string {
    if (!user_id) {
      throw new EngagementError('AUTH_REQUIRED');
    }
    return user_id;
  }

  private async requireOpen(user_id: string, article_id: string): Promise<void> {
    if (await this.accounts.isBlocked(user_id)) {
      throw new EngagementError('ACCOUNT_BLOCKED');
    }
    if (!(await this.articles.isPublished(article_id))) {
      throw new EngagementError('ARTICLE_NOT_FOUND');
    }
  }
}
