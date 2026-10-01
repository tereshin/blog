import { createRedisClient } from '@blog/redis';
import { Module } from '@nestjs/common';
import { RedisHitWindow } from './hit-window';
import { HttpRateLimitLookup } from './http-rate-limit-lookup';
import { type RateLimitLookup, SlidingWindowLimiter } from './sliding-window';

export const RATE_LIMIT_LOOKUP = Symbol('RATE_LIMIT_LOOKUP');

@Module({
  providers: [
    {
      provide: RATE_LIMIT_LOOKUP,
      useFactory: (): RateLimitLookup =>
        new HttpRateLimitLookup(process.env.USERS_BASE_URL ?? 'http://127.0.0.1:3003'),
    },
    {
      provide: SlidingWindowLimiter,
      useFactory: (settings: RateLimitLookup) =>
        new SlidingWindowLimiter(
          settings,
          new RedisHitWindow(createRedisClient(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379')),
        ),
      inject: [RATE_LIMIT_LOOKUP],
    },
  ],
  exports: [SlidingWindowLimiter],
})
export class RateLimitModule {}
