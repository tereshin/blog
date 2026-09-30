const status_by_code = {
  AUTH_REQUIRED: 401,
  ACCOUNT_BLOCKED: 403,
  ARTICLE_NOT_FOUND: 404,
  COMMENT_NOT_FOUND: 404,
} as const;

export type EngagementErrorCode = keyof typeof status_by_code;

export class EngagementError extends Error {
  readonly status_code: number;

  constructor(readonly code: EngagementErrorCode) {
    super(code);
    this.status_code = status_by_code[code];
  }
}
