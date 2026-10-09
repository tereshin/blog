import { NotFoundError, ValidationError } from '@blog/errors'

export class InvalidCursorError extends ValidationError {
  constructor() {
    super({ message: 'Курсор уведомлений не распознан' })
  }
}

export class NotificationNotFoundError extends NotFoundError {
  constructor() {
    super({ message: 'Уведомление не найдено' })
  }
}
