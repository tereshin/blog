import { NotFoundError } from '@blog/errors'

export class ArticleNotFoundError extends NotFoundError {
  constructor() {
    super({ message: 'Статья не найдена' })
  }
}
