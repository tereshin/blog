import { RateLimitError } from './rate-limit-error';
import type { RateLimitSetting, RateLimitStore } from './rate-limit-store';

export class RateLimitService {
  now: () => Date = () => new Date();

  constructor(private readonly store: RateLimitStore) {}

  async list(input: { actor_id: string; role: string }): Promise<{
    items: RateLimitSetting[];
    has_next: false;
    has_prev: false;
    next_cursor: null;
  }> {
    this.requireAdmin(input);
    const items = await this.store.list();
    return { items, has_next: false, has_prev: false, next_cursor: null };
  }

  async update(input: {
    actor_id: string;
    role: string;
    action: string;
    max_count: number;
    window_seconds: number;
  }): Promise<RateLimitSetting> {
    this.requireAdmin(input);
    const saved = await this.store.update(
      input.action,
      input.max_count,
      input.window_seconds,
      this.now().toISOString(),
    );
    if (!saved) {
      throw new RateLimitError('RATE_LIMIT_NOT_FOUND');
    }
    return saved;
  }

  async find(action: string): Promise<RateLimitSetting | null> {
    return this.store.find(action);
  }

  private requireAdmin(input: { actor_id: string; role: string }): void {
    if (!input.actor_id) {
      throw new RateLimitError('AUTH_REQUIRED');
    }
    if (input.role !== 'administrator') {
      throw new RateLimitError('ADMIN_ONLY');
    }
  }
}
