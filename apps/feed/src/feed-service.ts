import { FeedError } from './feed-error';
import { dropsFeedCache, type ArticleStats, type FollowGraph, type LanguageLimit, type PageCache, type PublishedArticles } from './feed-ports';
import type { Caller, FeedArticle, FeedPage, PopularWeights } from './feed-types';
import type { WeightStore } from './weight-store';

const page_size = 20;

export class FeedService {
  now: () => Date = () => new Date();
  assemble_count = 0;

  constructor(
    private readonly articles: PublishedArticles,
    private readonly stats: ArticleStats,
    private readonly follows: FollowGraph,
    private readonly languages: LanguageLimit,
    private readonly cache: PageCache,
    private readonly weights: WeightStore,
  ) {}

  async fresh(caller: Caller, cursor: string | null = null): Promise<FeedPage> {
    return this.cached('fresh', caller, cursor, async (articles) =>
      [...articles].sort((left, right) => right.published_at.localeCompare(left.published_at)),
    );
  }

  async popular(caller: Caller, cursor: string | null = null): Promise<FeedPage> {
    const weights = await this.weights.read();
    return this.cached('popular', caller, cursor, async (articles) => {
      const scored = await Promise.all(
        articles.map(async (article) => ({ article, score: await this.score(article, weights) })),
      );
      scored.sort((left, right) => right.score - left.score || right.article.published_at.localeCompare(left.article.published_at));
      return scored.map((row) => row.article);
    });
  }

  async mine(caller: Caller, cursor: string | null = null): Promise<FeedPage> {
    if (!caller.user_id) {
      throw new FeedError('AUTH_REQUIRED');
    }
    const user_id = caller.user_id;
    return this.cached('mine', caller, cursor, async (articles) => {
      const authors = new Set(await this.follows.userIds(user_id));
      const categories = new Set(await this.follows.categoryIds(user_id));
      return articles
        .filter((article) => authors.has(article.author_id) || categories.has(article.category_id))
        .sort((left, right) => right.published_at.localeCompare(left.published_at));
    });
  }

  async readWeights(caller: Caller): Promise<PopularWeights> {
    this.requireAdmin(caller);
    return this.weights.read();
  }

  async saveWeights(caller: Caller, next: Omit<PopularWeights, 'id'>): Promise<PopularWeights> {
    this.requireAdmin(caller);
    const current = await this.weights.read();
    const saved = { ...next, id: current.id };
    await this.weights.save(saved);
    await this.cache.drop();
    return saved;
  }

  async onArticleEvent(event_type: string): Promise<void> {
    if (dropsFeedCache(event_type)) {
      await this.cache.drop();
    }
  }

  private requireAdmin(caller: Caller): void {
    if (!caller.user_id) {
      throw new FeedError('AUTH_REQUIRED');
    }
    if (caller.role !== 'administrator') {
      throw new FeedError('ADMIN_ONLY');
    }
  }

  private async cached(
    kind: string,
    caller: Caller,
    cursor: string | null,
    order: (articles: FeedArticle[]) => Promise<FeedArticle[]>,
  ): Promise<FeedPage> {
    const limit = await this.limitFor(caller);
    const key = `${kind}:${caller.user_id ?? 'guest'}:${limit?.join(',') ?? 'all'}:${cursor ?? 'start'}`;
    const hit = await this.cache.get(key);
    if (hit) {
      return hit;
    }
    this.assemble_count += 1;
    const articles = await this.articles.list();
    const filtered = limit
      ? articles.filter((article) => limit.includes(article.language))
      : articles;
    const page = this.slice(await order(filtered), cursor);
    await this.cache.set(key, page);
    return page;
  }

  private async limitFor(caller: Caller): Promise<string[] | null> {
    if (!caller.user_id) {
      return null;
    }
    return this.languages.languages(caller.user_id);
  }

  private async score(article: FeedArticle, weights: PopularWeights): Promise<number> {
    const counts = await this.stats.counts(article.id);
    const age_hours = Math.max(0, (this.now().getTime() - Date.parse(article.published_at)) / 3_600_000);
    return (
      counts.view_count * weights.views_weight +
      counts.like_count * weights.likes_weight +
      counts.comment_count * weights.comments_weight +
      counts.bookmark_count * weights.bookmarks_weight -
      age_hours * weights.age_decay
    );
  }

  private slice(articles: FeedArticle[], cursor: string | null): FeedPage {
    const after_id = cursor?.startsWith('c:') ? cursor.slice(2) : null;
    const start = after_id ? articles.findIndex((article) => article.id === after_id) + 1 : 0;
    const items = articles.slice(start, start + page_size);
    const has_next = start + page_size < articles.length;
    const last = items.at(-1);
    return {
      items,
      has_next,
      has_prev: start > 0,
      next_cursor: has_next && last ? `c:${last.id}` : null,
    };
  }
}
