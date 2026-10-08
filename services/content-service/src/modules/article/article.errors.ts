import { AppError, NotFoundError, UnauthorizedError } from '@blog/errors'

export class ArticleMembersOnlyError extends UnauthorizedError {
  constructor() {
    super({ message: 'Статья доступна участникам', details: { reason: 'members_only' } })
  }
}

export class ArticleUnavailableError extends NotFoundError {
  constructor() {
    super({ message: 'Статья недоступна', details: { reason: 'unavailable' } })
  }
}

/** Неизвестный блок отклоняет весь документ, а не выкидывает один блок. */
export class InvalidBlockError extends AppError {
  constructor() {
    super({ code: 'invalid_block', http_status: 422, message: 'Документ содержит неизвестный блок' })
  }
}

/** Картинка или вложение не загружены этим автором на площадку. */
export class ForeignFileError extends AppError {
  constructor() {
    super({ code: 'foreign_file', http_status: 422, message: 'Файл должен быть загружен вами' })
  }
}
