import { Module } from '@nestjs/common';
import { DrizzleRateLimitStore } from './drizzle-rate-limit-store';
import { RateLimitController } from './rate-limit.controller';
import { RateLimitService } from './rate-limit-service';
import type { RateLimitStore } from './rate-limit-store';

export const RATE_LIMIT_STORE = Symbol('RATE_LIMIT_STORE');

@Module({
  controllers: [RateLimitController],
  providers: [
    {
      provide: RATE_LIMIT_STORE,
      useFactory: (): RateLimitStore => new DrizzleRateLimitStore(process.env.DATABASE_URL ?? ''),
    },
    {
      provide: RateLimitService,
      useFactory: (store: RateLimitStore) => new RateLimitService(store),
      inject: [RATE_LIMIT_STORE],
    },
  ],
})
export class RateLimitModule {}
