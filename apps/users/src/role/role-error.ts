const status_by_code = {
  ADMIN_ONLY: 403,
  FIRST_ADMINISTRATOR_FORBIDDEN: 403,
  LAST_ADMINISTRATOR: 409,
  REASON_REQUIRED: 422,
  USER_NOT_FOUND: 404,
} as const;

export type RoleErrorCode = keyof typeof status_by_code;

export class RoleError extends Error {
  readonly status_code: number;

  constructor(readonly code: RoleErrorCode) {
    super(code);
    this.status_code = status_by_code[code];
  }
}
