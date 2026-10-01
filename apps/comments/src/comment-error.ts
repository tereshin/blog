const status_by_code = {
  COMMENT_ARTICLE_NOT_VISIBLE: 422,
  COMMENT_BODY_REQUIRED: 422,
  COMMENT_NOT_FOUND: 404,
  COMPLAINT_REASON_REQUIRED: 422,
  REASON_REQUIRED: 422,
  STAFF_FORBIDDEN: 403,
} as const;

export type CommentErrorCode = keyof typeof status_by_code;

export class CommentError extends Error {
  readonly status_code: number;

  constructor(readonly code: CommentErrorCode) {
    super(code);
    this.status_code = status_by_code[code];
  }
}
