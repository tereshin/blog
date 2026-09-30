const status_by_code = {
  AUTH_REQUIRED: 401,
  ACCOUNT_BLOCKED: 403,
  MESSAGE_BODY_REQUIRED: 422,
  CONVERSATION_NOT_FOUND: 404,
} as const;

export type MessageErrorCode = keyof typeof status_by_code;

export class MessageError extends Error {
  readonly status_code: number;

  constructor(readonly code: MessageErrorCode) {
    super(code);
    this.status_code = status_by_code[code];
  }
}
