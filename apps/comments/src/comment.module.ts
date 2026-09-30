import { Module } from '@nestjs/common';
import type { ArticleVisibility } from './article-visibility';
import { CommentController } from './comment.controller';
import { CommentService } from './comment-service';
import type { CommentStore } from './comment-store';
import { DrizzleCommentStore } from './drizzle-comment-store';

export const COMMENT_STORE = Symbol('COMMENT_STORE');
export const ARTICLE_VISIBILITY = Symbol('ARTICLE_VISIBILITY');

@Module({
  controllers: [CommentController],
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
  ],
})
export class CommentModule {}
