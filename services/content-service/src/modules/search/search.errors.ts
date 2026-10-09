import { ValidationError } from '@blog/errors'

export class InvalidSearchCursorError extends ValidationError {
  constructor() {
    super({ message: 'Курсор поиска не распознан' })
  }
}
