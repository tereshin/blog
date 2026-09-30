const status_by_code = {
  REASON_REQUIRED: 422,
  BLOCK_NOT_FOUND: 404,
  STAFF_FORBIDDEN: 403,
  USER_NOT_FOUND: 404,
  ACCOUNT_BLOCKED: 403,
} as const;

export type BlockErrorCode = keyof typeof status_by_code;

export class BlockError extends Error {
  readonly status_code: number;

  constructor(readonly code: BlockErrorCode) {
    super(code);
    this.status_code = status_by_code[code];
  }
}
