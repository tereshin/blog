import { describe, expect, it } from 'vitest';
import { MemoryRateLimitStore } from '../src/rate-limits/memory-rate-limit-store';
import { RateLimitError } from '../src/rate-limits/rate-limit-error';
import { RateLimitService } from '../src/rate-limits/rate-limit-service';

const admin_id = '018f3c2a-7b10-7c3e-8f21-000000000001';

describe('rate limit settings', () => {
  it('lets an administrator change max_count and window_seconds', async () => {
    const service = new RateLimitService(new MemoryRateLimitStore());
    service.now = () => new Date('2026-09-30T12:00:00.000Z');

    const saved = await service.update({
      actor_id: admin_id,
      role: 'administrator',
      action: 'comment',
      max_count: 5,
      window_seconds: 30,
    });

    expect(saved).toEqual({
      action: 'comment',
      max_count: 5,
      window_seconds: 30,
      updated_at: '2026-09-30T12:00:00.000Z',
    });
    expect(await service.find('comment')).toEqual(saved);
  });

  it('refuses a moderator and an unknown action', async () => {
    const service = new RateLimitService(new MemoryRateLimitStore());

    await expect(
      service.update({
        actor_id: admin_id,
        role: 'moderator',
        action: 'comment',
        max_count: 1,
        window_seconds: 1,
      }),
    ).rejects.toMatchObject({ code: 'ADMIN_ONLY' });
    expect((await service.find('comment'))?.max_count).toBe(20);

    await expect(
      service.update({
        actor_id: admin_id,
        role: 'administrator',
        action: 'missing',
        max_count: 1,
        window_seconds: 1,
      }),
    ).rejects.toBeInstanceOf(RateLimitError);
  });
});
