import { NotFoundError, UnauthorizedError } from '@blog/errors'

export class ArticleMembersOnlyError extends UnauthorizedError {
  constructor() {
    super({ message: 'Статья доступна участникам', details: { reason: 'members_only' } })
  }
}

export class ArticleUnavailableError extends NotFoundError {
  constructor() {
    super({ message: 'Статья недоступна', details: { reason: 'unavailable' } })
  }
}
