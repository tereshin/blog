import { NotFoundError } from '@blog/errors'

/** Статьи нет или зрителю её читать нельзя: обсуждение не раскрывает, что скрыто. */
export class CommentArticleNotFoundError extends NotFoundError {
  constructor() {
    super({ message: 'Статья недоступна', details: { reason: 'unavailable' } })
  }
}
