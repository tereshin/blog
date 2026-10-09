import { AppError, NotFoundError, ValidationError } from '@blog/errors'

/** Статьи нет или зрителю её читать нельзя: обсуждение не раскрывает, что скрыто. */
export class CommentArticleNotFoundError extends NotFoundError {
  constructor() {
    super({ message: 'Статья недоступна', details: { reason: 'unavailable' } })
  }
}

/** Комментарии статьи выключены: новые не принимаются, уже написанные остаются. */
export class CommentsDisabledError extends AppError {
  constructor() {
    super({ code: 'comments_disabled', http_status: 403, message: 'Комментарии выключены' })
  }
}

/** Ответ не на комментарий этой статьи или не на корень обсуждения. */
export class CommentParentInvalidError extends ValidationError {
  constructor() {
    super({ message: 'Ответить на этот комментарий нельзя', details: { reason: 'parent' } })
  }
}

/** Чужой, уже снятый или неизвестный комментарий не раскрываем. */
export class CommentNotFoundError extends NotFoundError {
  constructor() {
    super({ message: 'Комментарий недоступен' })
  }
}
