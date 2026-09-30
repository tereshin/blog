import { Module } from '@nestjs/common';
import type { ArticleVisibility } from './article-visibility';
import { CommentController } from './comment.controller';
import { CommentService } from './comment-service';
import type { CommentStore } from './comment-store';
import { ComplaintController } from './complaint.controller';
import { ComplaintService } from './complaint-service';
import type { ComplaintStore } from './complaint-store';
import { DrizzleCommentStore } from './drizzle-comment-store';
import { DrizzleComplaintStore } from './drizzle-complaint-store';

export const COMMENT_STORE = Symbol('COMMENT_STORE');
export const ARTICLE_VISIBILITY = Symbol('ARTICLE_VISIBILITY');
export const COMPLAINT_STORE = Symbol('COMPLAINT_STORE');

@Module({
  controllers: [CommentController, ComplaintController],
  providers: [
    {
      provide: COMMENT_STORE,
      useFactory: (): CommentStore => new DrizzleCommentStore(process.env.DATABASE_URL ?? ''),
    },
    {
      provide: ARTICLE_VISIBILITY,
      useValue: { async isPublished(): Promise<boolean> { return false; } } satisfies ArticleVisibility,
    },
    {
      provide: CommentService,
      useFactory: (store: CommentStore, articles: ArticleVisibility) =>
        new CommentService(store, articles),
      inject: [COMMENT_STORE, ARTICLE_VISIBILITY],
    },
    {
      provide: COMPLAINT_STORE,
      useFactory: (): ComplaintStore => new DrizzleComplaintStore(process.env.DATABASE_URL ?? ''),
    },
    {
      provide: ComplaintService,
      useFactory: (comments: CommentStore, complaints: ComplaintStore) =>
        new ComplaintService(comments, complaints),
      inject: [COMMENT_STORE, COMPLAINT_STORE],
    },
  ],
})
export class CommentModule {}
