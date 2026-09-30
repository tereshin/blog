const status_by_code = {
  ADMIN_ONLY: 403,
  CATEGORY_TRANSLATIONS_REQUIRED: 422,
  CATEGORY_NOT_FOUND: 404,
} as const;

export type CategoryErrorCode = keyof typeof status_by_code;

export class CategoryError extends Error {
  readonly status_code: number;

  constructor(readonly code: CategoryErrorCode) {
    super(code);
    this.status_code = status_by_code[code];
  }
}
