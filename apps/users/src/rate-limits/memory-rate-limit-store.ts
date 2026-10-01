import {
  type RateLimitSetting,
  type RateLimitStore,
  seeded_rate_limits,
} from './rate-limit-store';

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly rows = new Map<string, RateLimitSetting>(
    seeded_rate_limits.map((row) => [row.action, { ...row }]),
  );

  async list(): Promise<RateLimitSetting[]> {
    return [...this.rows.values()];
  }

  async find(action: string): Promise<RateLimitSetting | null> {
    return this.rows.get(action) ?? null;
  }

  async update(
    action: string,
    max_count: number,
    window_seconds: number,
    updated_at: string,
  ): Promise<RateLimitSetting | null> {
    const current = this.rows.get(action);
    if (!current) {
      return null;
    }
    const next = { action, max_count, window_seconds, updated_at };
    this.rows.set(action, next);
    return next;
  }
}
