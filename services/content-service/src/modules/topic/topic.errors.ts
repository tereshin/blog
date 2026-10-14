import { NotFoundError, ValidationError } from '@blog/errors'

export class TopicNotFoundError extends NotFoundError {
  constructor() {
    super({ message: 'Такой темы нет' })
  }
}

/** Новый порядок должен перечислять каждую тему ровно один раз. */
export class TopicOrderInvalidError extends ValidationError {
  constructor() {
    super({
      message: 'Список должен содержать все темы по одному разу',
      details: { field: 'topic_ids' },
    })
  }
}
