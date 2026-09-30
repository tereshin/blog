import { Module } from '@nestjs/common';
import { DrizzleSocialStore } from './drizzle-social-store';
import type { KnownCategories, KnownUsers } from './social-ports';
import { SocialController } from './social.controller';
import { SocialService } from './social-service';
import type { SocialStore } from './social-store';

export const SOCIAL_STORE = Symbol('SOCIAL_STORE');
export const KNOWN_USERS = Symbol('KNOWN_USERS');
export const KNOWN_CATEGORIES = Symbol('KNOWN_CATEGORIES');

const missing_users: KnownUsers = { async exists() { return false; } };
const missing_categories: KnownCategories = { async exists() { return false; } };

@Module({
  controllers: [SocialController],
  providers: [
    {
      provide: SOCIAL_STORE,
      useFactory: (): SocialStore => new DrizzleSocialStore(process.env.DATABASE_URL ?? ''),
    },
    { provide: KNOWN_USERS, useValue: missing_users },
    { provide: KNOWN_CATEGORIES, useValue: missing_categories },
    {
      provide: SocialService,
      useFactory: (store: SocialStore, users: KnownUsers, categories: KnownCategories) =>
        new SocialService(store, users, categories),
      inject: [SOCIAL_STORE, KNOWN_USERS, KNOWN_CATEGORIES],
    },
  ],
})
export class SocialModule {}
