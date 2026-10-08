import { NotFoundError } from '@blog/errors'

/** Сессия отозвана, истекла или не существует — для gateway это «гость». */
export class SessionNotFoundError extends NotFoundError {
  constructor() {
    super({ message: 'Сессия не найдена' })
  }
}
