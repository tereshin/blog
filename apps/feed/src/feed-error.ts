const status_by_code = {
  AUTH_REQUIRED: 401,
  ADMIN_ONLY: 403,
} as const;

export type FeedErrorCode = keyof typeof status_by_code;

export class FeedError extends Error {
  readonly status_code: number;

  constructor(readonly code: FeedErrorCode) {
    super(code);
    this.status_code = status_by_code[code];
  }
}
