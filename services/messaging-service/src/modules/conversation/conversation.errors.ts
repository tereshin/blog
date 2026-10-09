import { NotFoundError, ValidationError } from '@blog/errors'

export class InvalidCursorError extends ValidationError {
  constructor() {
    super({ message: 'Курсор диалогов не распознан' })
  }
}

export class ConversationNotFoundError extends NotFoundError {
  constructor() {
    super({ message: 'Диалог не найден' })
  }
}
