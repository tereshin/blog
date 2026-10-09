import { NotFoundError } from '@blog/errors'

/** Статьи нет или зрителю её читать нельзя: просмотр не раскрывает, что скрыто. */
export class ViewArticleNotFoundError extends NotFoundError {
  constructor() {
    super({ message: 'Статья недоступна', details: { reason: 'unavailable' } })
  }
}
