import { NotFoundError } from '@blog/errors'

export class BookmarkNotAllowedError extends NotFoundError {
  constructor() {
    super({ message: 'Статью нельзя добавить в закладки', details: { reason: 'unavailable' } })
  }
}
