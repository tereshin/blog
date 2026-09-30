const status_by_code = {
  USERNAME_TAKEN: 409,
  USERNAME_REQUIRED: 422,
  CONTENT_LANGUAGE_INVALID: 422,
  USER_NOT_FOUND: 404,
} as const;

export type ProfileErrorCode = keyof typeof status_by_code;

export class ProfileError extends Error {
  readonly status_code: number;

  constructor(readonly code: ProfileErrorCode) {
    super(code);
    this.status_code = status_by_code[code];
  }
}
