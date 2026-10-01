export type RateLimitSetting = {
  action: string;
  max_count: number;
  window_seconds: number;
  updated_at: string;
};

export const seeded_rate_limits: RateLimitSetting[] = [
  { action: 'comment', max_count: 20, window_seconds: 60, updated_at: '2026-09-30T00:00:00.000Z' },
  { action: 'like', max_count: 60, window_seconds: 60, updated_at: '2026-09-30T00:00:00.000Z' },
  { action: 'follow', max_count: 30, window_seconds: 60, updated_at: '2026-09-30T00:00:00.000Z' },
  { action: 'direct_message', max_count: 60, window_seconds: 60, updated_at: '2026-09-30T00:00:00.000Z' },
  { action: 'article_edit', max_count: 60, window_seconds: 60, updated_at: '2026-09-30T00:00:00.000Z' },
  { action: 'image_attachment', max_count: 20, window_seconds: 3600, updated_at: '2026-09-30T00:00:00.000Z' },
  { action: 'anonymous_read', max_count: 60, window_seconds: 60, updated_at: '2026-09-30T00:00:00.000Z' },
];

export interface RateLimitStore {
  list(): Promise<RateLimitSetting[]>;
  find(action: string): Promise<RateLimitSetting | null>;
  update(action: string, max_count: number, window_seconds: number, updated_at: string): Promise<RateLimitSetting | null>;
}
