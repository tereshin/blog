import { describe, expect, it } from 'vitest';
import { MemoryViewWindow } from '../src/engagement-ports';
import { ViewFlush, type ViewCounts } from '../src/view-flush';

const article_id = '018f3c2a-7b10-7c3e-8f21-0000000000a1';
const viewer_id = 'guest-session-1';

class MemoryViewCounts implements ViewCounts {
  readonly counts = new Map<string, number>();
  readonly outbox: string[] = [];

  async add(id: string, delta: number): Promise<void> {
    this.counts.set(id, (this.counts.get(id) ?? 0) + delta);
  }

  async read(id: string): Promise<number> {
    return this.counts.get(id) ?? 0;
  }
}

describe('view flush', () => {
  it('stores one durable view after a second look inside 30 minutes', async () => {
    const window = new MemoryViewWindow();
    const counts = new MemoryViewCounts();
    const flush = new ViewFlush(window, counts);
    const now_ms = Date.parse('2026-09-30T00:00:00.000Z');

    expect(await window.claim(article_id, viewer_id, now_ms)).toBe(true);
    expect(await window.claim(article_id, viewer_id, now_ms + 60_000)).toBe(false);

    await flush.run();

    expect(await counts.read(article_id)).toBe(1);
    expect(window.pending.has(`view:${article_id}:${viewer_id}`)).toBe(true);
    expect(window.pending.has(`pending:${article_id}`)).toBe(false);
    expect(counts.outbox).toEqual([]);
  });

  it('leaves the stored count alone when Redis has no delta', async () => {
    const window = new MemoryViewWindow();
    const counts = new MemoryViewCounts();
    counts.counts.set(article_id, 4);
    const flush = new ViewFlush(window, counts);

    await flush.run();

    expect(await counts.read(article_id)).toBe(4);
  });
});
