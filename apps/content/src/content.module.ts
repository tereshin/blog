import { Module } from '@nestjs/common';
import type { ArticleStore } from './article-store';
import { DraftController } from './draft.controller';
import { DraftService } from './draft-service';
import { DrizzleArticleStore } from './drizzle-article-store';
import { ComplaintController } from './complaint.controller';
import { ComplaintService } from './complaint-service';
import { DrizzleComplaintStore } from './drizzle-complaint-store';
import { PublishController } from './publish.controller';
import { PublishService } from './publish-service';
import type { ComplaintStore } from './complaint-store';

export const ARTICLE_STORE = Symbol('ARTICLE_STORE');
export const COMPLAINT_STORE = Symbol('COMPLAINT_STORE');

export const content_routes = [
  'POST /api/v1/articles',
  'PATCH /api/v1/me/articles/:article_id',
  'GET /api/v1/me/articles/:article_id',
  'POST /api/v1/articles/:article_id/publish',
  'POST /api/v1/articles/:article_id/withdraw',
  'POST /api/v1/articles/:article_id/complaints',
] as const;

@Module({
  controllers: [DraftController, PublishController, ComplaintController],
  providers: [
    {
      provide: ARTICLE_STORE,
      useFactory: (): ArticleStore => new DrizzleArticleStore(process.env.DATABASE_URL ?? ''),
    },
    {
      provide: DraftService,
      useFactory: (store: ArticleStore) => new DraftService(store),
      inject: [ARTICLE_STORE],
    },
    {
      provide: PublishService,
      useFactory: (store: ArticleStore) =>
        new PublishService(store, {
          async hasUsername() {
            return false;
          },
          async isBlocked() {
            return false;
          },
        }),
      inject: [ARTICLE_STORE],
    },
    {
      provide: COMPLAINT_STORE,
      useFactory: (): ComplaintStore => new DrizzleComplaintStore(process.env.DATABASE_URL ?? ''),
    },
    {
      provide: ComplaintService,
      useFactory: (articles: ArticleStore, complaints: ComplaintStore) =>
        new ComplaintService(articles, complaints),
      inject: [ARTICLE_STORE, COMPLAINT_STORE],
    },
  ],
})
export class ContentModule {}
