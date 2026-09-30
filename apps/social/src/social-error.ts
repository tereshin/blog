const status_by_code = {
  USER_NOT_FOUND: 404,
  CATEGORY_NOT_FOUND: 404,
} as const;

export type SocialErrorCode = keyof typeof status_by_code;

export class SocialError extends Error {
  readonly status_code: number;

  constructor(readonly code: SocialErrorCode) {
    super(code);
    this.status_code = status_by_code[code];
  }
}
