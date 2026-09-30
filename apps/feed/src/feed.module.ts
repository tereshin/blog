import { Module } from '@nestjs/common';
import { DrizzleWeightStore } from './drizzle-weight-store';
import { FeedController } from './feed.controller';
import { FeedService } from './feed-service';
import { MemoryPageCache, type ArticleStats, type FollowGraph, type LanguageLimit, type PageCache, type PublishedArticles } from './feed-ports';
import type { WeightStore } from './weight-store';

export const PUBLISHED_ARTICLES = Symbol('PUBLISHED_ARTICLES');
export const ARTICLE_STATS = Symbol('ARTICLE_STATS');
export const FOLLOW_GRAPH = Symbol('FOLLOW_GRAPH');
export const LANGUAGE_LIMIT = Symbol('LANGUAGE_LIMIT');
export const PAGE_CACHE = Symbol('PAGE_CACHE');
export const WEIGHT_STORE = Symbol('WEIGHT_STORE');

const empty_articles: PublishedArticles = { async list() { return []; } };
const zero_stats: ArticleStats = {
  async counts() {
    return { view_count: 0, like_count: 0, comment_count: 0, bookmark_count: 0 };
  },
};
const empty_follows: FollowGraph = {
  async userIds() { return []; },
  async categoryIds() { return []; },
};
const no_limit: LanguageLimit = { async languages() { return null; } };

@Module({
  controllers: [FeedController],
  providers: [
    { provide: PUBLISHED_ARTICLES, useValue: empty_articles },
    { provide: ARTICLE_STATS, useValue: zero_stats },
    { provide: FOLLOW_GRAPH, useValue: empty_follows },
    { provide: LANGUAGE_LIMIT, useValue: no_limit },
    { provide: PAGE_CACHE, useFactory: (): PageCache => new MemoryPageCache() },
    { provide: WEIGHT_STORE, useFactory: (): WeightStore => new DrizzleWeightStore(process.env.DATABASE_URL ?? '') },
    {
      provide: FeedService,
      useFactory: (
        articles: PublishedArticles,
        stats: ArticleStats,
        follows: FollowGraph,
        languages: LanguageLimit,
        cache: PageCache,
        weights: WeightStore,
      ) => new FeedService(articles, stats, follows, languages, cache, weights),
      inject: [PUBLISHED_ARTICLES, ARTICLE_STATS, FOLLOW_GRAPH, LANGUAGE_LIMIT, PAGE_CACHE, WEIGHT_STORE],
    },
  ],
})
export class FeedModule {}
