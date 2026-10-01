export interface HitWindow {
  count(key: string, now_ms: number, window_ms: number): Promise<number>;
}

export class MemoryHitWindow implements HitWindow {
  private readonly hits = new Map<string, number[]>();

  async count(key: string, now_ms: number, window_ms: number): Promise<number> {
    const floor = now_ms - window_ms;
    const kept = (this.hits.get(key) ?? []).filter((at) => at > floor);
    kept.push(now_ms);
    this.hits.set(key, kept);
    return kept.length;
  }
}

type SortedSet = {
  zadd(key: string, score: number, member: string): Promise<unknown>;
  zremrangebyscore(key: string, min: number, max: number): Promise<unknown>;
  zcard(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
};

export class RedisHitWindow implements HitWindow {
  constructor(private readonly redis: SortedSet) {}

  async count(key: string, now_ms: number, window_ms: number): Promise<number> {
    const floor = now_ms - window_ms;
    await this.redis.zadd(key, now_ms, `${now_ms}:${Math.random()}`);
    await this.redis.zremrangebyscore(key, 0, floor);
    const count = await this.redis.zcard(key);
    await this.redis.expire(key, Math.max(1, Math.ceil(window_ms / 1000)));
    return count;
  }
}
