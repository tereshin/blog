import { ValidationError } from '@blog/errors'

export class InvalidCursorError extends ValidationError {
  constructor() {
    super({ message: 'Курсор ленты не распознан' })
  }
}
