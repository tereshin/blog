import { AppError, ValidationError } from '@blog/errors'

/** Режим ещё не реализован: «Моя лента» появляется вместе с подписками. */
export class FeedModeNotImplementedError extends AppError {
  constructor(mode: string) {
    super({ code: 'not_implemented', http_status: 501, message: `Режим ленты «${mode}» пока недоступен` })
  }
}

export class InvalidCursorError extends ValidationError {
  constructor() {
    super({ message: 'Курсор ленты не распознан' })
  }
}
