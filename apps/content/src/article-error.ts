const status_by_code = {
  ARTICLE_VERSION_CONFLICT: 409,
  ARTICLE_NOT_OWNED: 403,
  ARTICLE_BLOCK_REJECTED: 422,
  ARTICLE_NOT_FOUND: 404,
  ARTICLE_CATEGORY_REQUIRED: 422,
  ARTICLE_TITLE_REQUIRED: 422,
  ARTICLE_TEXT_REQUIRED: 422,
  ARTICLE_LANGUAGE_REQUIRED: 422,
  USERNAME_REQUIRED: 422,
  ACCOUNT_BLOCKED: 403,
  MEDIA_NOT_FOUND: 404,
  COMPLAINT_REASON_REQUIRED: 422,
  REASON_REQUIRED: 422,
  ADMIN_ONLY: 403,
  STAFF_FORBIDDEN: 403,
  CATEGORY_NOT_FOUND: 404,
  COMPLAINT_NOT_FOUND: 404,
} as const;

export type ArticleErrorCode = keyof typeof status_by_code;

export class ArticleError extends Error {
  readonly status_code: number;

  constructor(
    readonly code: ArticleErrorCode,
    readonly params: Record<string, unknown> = {},
  ) {
    super(code);
    this.status_code = status_by_code[code];
  }
}
