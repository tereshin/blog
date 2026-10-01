import type { HitWindow } from './hit-window';

export type LimitSetting = {
  max_count: number;
  window_seconds: number;
};

export interface RateLimitLookup {
  find(action: string): Promise<LimitSetting | null>;
}

const status_by_code = {
  RATE_LIMITED: 429,
} as const;

export class RateLimitedError extends Error {
  readonly status_code = status_by_code.RATE_LIMITED;

  constructor(readonly action: string) {
    super('RATE_LIMITED');
  }

  get code(): 'RATE_LIMITED' {
    return 'RATE_LIMITED';
  }

  get params(): { action: string } {
    return { action: this.action };
  }
}

export class SlidingWindowLimiter {
  constructor(
    private readonly settings: RateLimitLookup,
    private readonly window: HitWindow,
  ) {}

  async consume(input: { action: string; subject: string; now_ms: number }): Promise<void> {
    const setting = await this.settings.find(input.action);
    if (!setting) {
      return;
    }
    const count = await this.window.count(
      `rate:${input.action}:${input.subject}`,
      input.now_ms,
      setting.window_seconds * 1000,
    );
    if (count > setting.max_count) {
      throw new RateLimitedError(input.action);
    }
  }
}
