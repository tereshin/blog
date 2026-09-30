import type { ArticleCounts, FeedArticle, FeedPage } from './feed-types';

export interface PublishedArticles {
  list(): Promise<FeedArticle[]>;
}

export interface ArticleStats {
  counts(article_id: string): Promise<ArticleCounts>;
}

export interface FollowGraph {
  userIds(follower_id: string): Promise<string[]>;
  categoryIds(follower_id: string): Promise<string[]>;
}

export interface LanguageLimit {
  languages(user_id: string): Promise<string[] | null>;
}

export interface PageCache {
  get(key: string): Promise<FeedPage | null>;
  set(key: string, page: FeedPage): Promise<void>;
  drop(): Promise<void>;
}

export class MemoryPageCache implements PageCache {
  readonly pages = new Map<string, FeedPage>();
  reads = 0;

  async get(key: string): Promise<FeedPage | null> {
    this.reads += 1;
    return this.pages.get(key) ?? null;
  }

  async set(key: string, page: FeedPage): Promise<void> {
    this.pages.set(key, page);
  }

  async drop(): Promise<void> {
    this.pages.clear();
  }
}

const drop_events = ['published', 'hidden', 'soft_removed', 'revised'];

export function dropsFeedCache(event_type: string): boolean {
  return drop_events.some((name) => event_type.endsWith(name));
}
