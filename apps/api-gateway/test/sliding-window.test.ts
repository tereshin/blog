import { describe, expect, it } from 'vitest';
import { MemoryHitWindow } from '../src/rate-limit/hit-window';
import { RateLimitedError, SlidingWindowLimiter } from '../src/rate-limit/sliding-window';

const anonymous_read = { max_count: 60, window_seconds: 60 };

describe('sliding window', () => {
  it('blocks the 61st anonymous read and allows it after the window slides', async () => {
    const limiter = new SlidingWindowLimiter(
      { async find() { return anonymous_read; } },
      new MemoryHitWindow(),
    );
    const subject = 'visitor-1';

    for (let index = 0; index < 60; index += 1) {
      await limiter.consume({ action: 'anonymous_read', subject, now_ms: 0 });
    }

    await expect(
      limiter.consume({ action: 'anonymous_read', subject, now_ms: 30_000 }),
    ).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      params: { action: 'anonymous_read' },
    });

    await expect(
      limiter.consume({ action: 'anonymous_read', subject, now_ms: 60_001 }),
    ).resolves.toBeUndefined();
  });

  it('does not reset the window on the clock minute', async () => {
    const limiter = new SlidingWindowLimiter(
      { async find() { return { max_count: 2, window_seconds: 60 }; } },
      new MemoryHitWindow(),
    );

    await limiter.consume({ action: 'comment', subject: 'user-1', now_ms: 50_000 });
    await limiter.consume({ action: 'comment', subject: 'user-1', now_ms: 59_000 });

    await expect(
      limiter.consume({ action: 'comment', subject: 'user-1', now_ms: 60_000 }),
    ).rejects.toBeInstanceOf(RateLimitedError);
  });
});
