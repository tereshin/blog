import { Module } from '@nestjs/common';
import type { ArticleStore } from './article-store';
import { DraftController } from './draft.controller';
import { DraftService } from './draft-service';
import { DrizzleArticleStore } from './drizzle-article-store';

export const ARTICLE_STORE = Symbol('ARTICLE_STORE');

@Module({
  controllers: [DraftController],
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
  ],
})
export class ContentModule {}
