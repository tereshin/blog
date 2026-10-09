import { AppError } from '@blog/errors'

/** Подписка на свою учётную запись. */
export class SelfFollowError extends AppError {
  constructor() {
    super({ code: 'self_follow', http_status: 422, message: 'Нельзя подписаться на себя' })
  }
}
