import { Module } from '@nestjs/common';
import { SlidingWindowLimiter } from '../rate-limit/sliding-window';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { PublicArticleController } from './public.controller';
import {
  type ArticleCatalog,
  type ArticleComments,
  type ArticleEngagement,
  type GuestCommands,
  type PublicAuthors,
  PublicArticleService,
} from './public-article';

const empty_page = { items: [], has_next: false, has_prev: false, next_cursor: null };

@Module({
  imports: [RateLimitModule],
  controllers: [PublicArticleController],
  providers: [
    {
      provide: PublicArticleService,
      useFactory: (limiter: SlidingWindowLimiter) =>
        new PublicArticleService(
          {
            async findBySlug() {
              return null;
            },
            async findById() {
              return null;
            },
          } satisfies ArticleCatalog,
          { async find() { return null; } } satisfies PublicAuthors,
          { async list() { return empty_page; } } satisfies ArticleComments,
          {
            async counts() {
              return {
                like_count: 0,
                comment_count: 0,
                view_count: 0,
                liked_by_viewer: false,
                bookmarked_by_viewer: false,
              };
            },
          } satisfies ArticleEngagement,
          limiter,
          { async run() {} } satisfies GuestCommands,
        ),
      inject: [SlidingWindowLimiter],
    },
  ],
})
export class PublicModule {}
