import { Module } from '@nestjs/common';
import type { AccountAccess, KnownComments, PublishedArticles, ViewWindow } from './engagement-ports';
import { MemoryViewWindow } from './engagement-ports';
import { EngagementController } from './engagement.controller';
import { EngagementService } from './engagement-service';
import type { EngagementStore } from './engagement-store';
import { DrizzleEngagementStore } from './drizzle-engagement-store';

export const ENGAGEMENT_STORE = Symbol('ENGAGEMENT_STORE');
export const PUBLISHED_ARTICLES = Symbol('PUBLISHED_ARTICLES');
export const KNOWN_COMMENTS = Symbol('KNOWN_COMMENTS');
export const ACCOUNT_ACCESS = Symbol('ACCOUNT_ACCESS');
export const VIEW_WINDOW = Symbol('VIEW_WINDOW');

const closed_articles: PublishedArticles = { async isPublished() { return false; } };
const unknown_comments: KnownComments = { async exists() { return false; } };
const open_accounts: AccountAccess = { async isBlocked() { return false; } };

@Module({
  controllers: [EngagementController],
  providers: [
    { provide: ENGAGEMENT_STORE, useFactory: (): EngagementStore => new DrizzleEngagementStore(process.env.DATABASE_URL ?? '') },
    { provide: PUBLISHED_ARTICLES, useValue: closed_articles },
    { provide: KNOWN_COMMENTS, useValue: unknown_comments },
    { provide: ACCOUNT_ACCESS, useValue: open_accounts },
    { provide: VIEW_WINDOW, useFactory: (): ViewWindow => new MemoryViewWindow() },
    {
      provide: EngagementService,
      useFactory: (
        store: EngagementStore,
        articles: PublishedArticles,
        comments: KnownComments,
        accounts: AccountAccess,
        views: ViewWindow,
      ) => new EngagementService(store, articles, comments, accounts, views),
      inject: [ENGAGEMENT_STORE, PUBLISHED_ARTICLES, KNOWN_COMMENTS, ACCOUNT_ACCESS, VIEW_WINDOW],
    },
  ],
})
export class EngagementModule {}
