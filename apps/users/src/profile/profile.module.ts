import { Module } from '@nestjs/common';
import { DrizzleProfileStore } from './drizzle-profile-store';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile-service';
import type { ProfileStore } from './profile-store';

export const PROFILE_STORE = Symbol('PROFILE_STORE');

@Module({
  controllers: [ProfileController],
  providers: [
    {
      provide: PROFILE_STORE,
      useFactory: (): ProfileStore =>
        new DrizzleProfileStore(process.env.DATABASE_URL ?? ''),
    },
    {
      provide: ProfileService,
      useFactory: (store: ProfileStore) => new ProfileService(store),
      inject: [PROFILE_STORE],
    },
  ],
})
export class ProfileModule {}
