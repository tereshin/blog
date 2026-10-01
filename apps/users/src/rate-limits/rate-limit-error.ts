const status_by_code = {
  AUTH_REQUIRED: 401,
  ADMIN_ONLY: 403,
  RATE_LIMIT_NOT_FOUND: 404,
} as const;

export type RateLimitErrorCode = keyof typeof status_by_code;

export class RateLimitError extends Error {
  readonly status_code: number;

  constructor(readonly code: RateLimitErrorCode) {
    super(code);
    this.status_code = status_by_code[code];
  }
}
