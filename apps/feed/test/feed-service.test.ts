import { describe, expect, it } from 'vitest';
import { FeedService } from '../src/feed-service';
import { MemoryPageCache, type ArticleStats, type FollowGraph, type LanguageLimit, type PublishedArticles } from '../src/feed-ports';
import type { ArticleCounts, Caller, FeedArticle } from '../src/feed-types';
import { MemoryWeightStore } from '../src/memory-weight-store';

const guest: Caller = { user_id: null, role: null };
const reader: Caller = { user_id: '018f3c2a-7b10-7c3e-8f21-0000000000b9', role: 'user' };
const admin: Caller = { user_id: '018f3c2a-7b10-7c3e-8f21-000000000001', role: 'administrator' };
const moderator: Caller = { user_id: '018f3c2a-7b10-7c3e-8f21-0000000000b8', role: 'moderator' };

function article(partial: Partial<FeedArticle> & Pick<FeedArticle, 'id' | 'published_at'>): FeedArticle {
  return {
    slug: partial.id,
    title: partial.id,
    language: 'en',
    author_id: '018f3c2a-7b10-7c3e-8f21-0000000000b1',
    category_id: '018f3c2a-7b10-7c3e-8f21-0000000000c1',
    ...partial,
  };
}

const older = article({
  id: '018f3c2a-7b10-7c3e-8f21-0000000000a1',
  published_at: '2026-09-30T00:00:00Z',
  language: 'ru',
  author_id: '018f3c2a-7b10-7c3e-8f21-0000000000b1',
});
const newer = article({
  id: '018f3c2a-7b10-7c3e-8f21-0000000000a2',
  published_at: '2026-09-30T00:30:00Z',
  language: 'en',
  author_id: '018f3c2a-7b10-7c3e-8f21-0000000000b2',
  category_id: '018f3c2a-7b10-7c3e-8f21-0000000000c2',
});
const blocked_author = article({
  id: '018f3c2a-7b10-7c3e-8f21-0000000000a3',
  published_at: '2026-09-29T00:00:00Z',
  language: 'sr-Latn',
  author_id: '018f3c2a-7b10-7c3e-8f21-0000000000b3',
  category_id: '018f3c2a-7b10-7c3e-8f21-0000000000c9',
});

const counts: Record<string, ArticleCounts> = {
  [older.id]: { view_count: 100, like_count: 100, comment_count: 100, bookmark_count: 100 },
  [newer.id]: { view_count: 0, like_count: 0, comment_count: 0, bookmark_count: 0 },
  [blocked_author.id]: { view_count: 0, like_count: 0, comment_count: 0, bookmark_count: 0 },
};

function harness(languages: string[] | null = null) {
  let list_calls = 0;
  const articles: PublishedArticles = {
    async list() {
      list_calls += 1;
      return [older, newer, blocked_author];
    },
  };
  const stats: ArticleStats = { async counts(id) { return counts[id] ?? { view_count: 0, like_count: 0, comment_count: 0, bookmark_count: 0 }; } };
  const follows: FollowGraph = {
    async userIds() { return ['018f3c2a-7b10-7c3e-8f21-0000000000b2']; },
    async categoryIds() { return ['018f3c2a-7b10-7c3e-8f21-0000000000c1']; },
  };
  const limit: LanguageLimit = { async languages() { return languages; } };
  const cache = new MemoryPageCache();
  const weight_store = new MemoryWeightStore();
  const feeds = new FeedService(articles, stats, follows, limit, cache, weight_store);
  feeds.now = () => new Date('2026-09-30T01:00:00Z');
  return { feeds, cache, weight_store, listCalls: () => list_calls };
}

describe('feeds', () => {
  it('lists fresh newest first, popular by score, and refuses my feed to a guest', async () => {
    const { feeds } = harness();
    const fresh = await feeds.fresh(guest);
    expect(fresh.items.map((item) => item.id)).toEqual([newer.id, older.id, blocked_author.id]);
    const popular = await feeds.popular(guest);
    expect(popular.items[0]?.id).toBe(older.id);
    await expect(feeds.mine(guest)).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
  });

  it('keeps a blocked author visible and filters my feed to follows and languages', async () => {
    const { feeds } = harness(['en', 'ru']);
    const fresh = await feeds.fresh(reader);
    expect(fresh.items.map((item) => item.id)).toEqual([newer.id, older.id]);
    expect(fresh.items.some((item) => item.author_id === blocked_author.author_id)).toBe(false);
    const mine = await feeds.mine(reader);
    expect(mine.items.map((item) => item.id)).toEqual([newer.id, older.id]);
    const open = harness(null);
    const every = await open.feeds.fresh(reader);
    expect(every.items.map((item) => item.id)).toContain(blocked_author.id);
    expect(every.items.map((item) => item.language).sort()).toEqual(['en', 'ru', 'sr-Latn']);
  });

  it('uses saved weights for an administrator and refuses a moderator', async () => {
    const { feeds, weight_store } = harness();
    await expect(feeds.saveWeights(moderator, { ...weight_store.weights, likes_weight: 0, views_weight: 0, comments_weight: 0, bookmarks_weight: 0, age_decay: 0 })).rejects.toMatchObject({ code: 'ADMIN_ONLY' });
    await feeds.saveWeights(admin, {
      views_weight: 0,
      likes_weight: 0,
      comments_weight: 0,
      bookmarks_weight: 0,
      age_decay: 10,
    });
    const popular = await feeds.popular(guest);
    expect(popular.items[0]?.id).toBe(newer.id);
  });

  it('returns a cached page and drops it when an article event arrives', async () => {
    const { feeds, cache } = harness();
    await feeds.fresh(guest);
    const before = feeds.assemble_count;
    await feeds.fresh(guest);
    expect(feeds.assemble_count).toBe(before);
    expect(cache.pages.size).toBe(1);
    await feeds.onArticleEvent('content.article.published');
    expect(cache.pages.size).toBe(0);
  });
});
