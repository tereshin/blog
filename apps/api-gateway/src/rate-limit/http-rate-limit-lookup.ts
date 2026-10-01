import type { LimitSetting, RateLimitLookup } from './sliding-window';

export class HttpRateLimitLookup implements RateLimitLookup {
  constructor(private readonly base_url: string) {}

  async find(action: string): Promise<LimitSetting | null> {
    const response = await fetch(`${this.base_url}/api/v1/internal/rate-limits/${action}`);
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as LimitSetting | null;
    if (!body) {
      return null;
    }
    return { max_count: body.max_count, window_seconds: body.window_seconds };
  }
}
