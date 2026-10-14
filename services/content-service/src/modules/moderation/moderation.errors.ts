import { ConflictError, NotFoundError } from '@blog/errors'

export class ModerationArticleNotFoundError extends NotFoundError {}

export class ReportNotFoundError extends NotFoundError {}

export class ArticleNotHideableError extends ConflictError {
  constructor() {
    super({ message: 'Скрыть можно только опубликованную статью' })
  }
}

export class ArticleNotRestorableError extends ConflictError {
  constructor() {
    super({ message: 'Вернуть можно только скрытую статью' })
  }
}
