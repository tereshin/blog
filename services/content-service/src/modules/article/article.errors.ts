import { AppError, NotFoundError, UnauthorizedError } from '@blog/errors'

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

export {
  InvalidBlockError,
  ForeignFileError,
} from '../../shared/editor-document/document.errors.ts'

/** Право публикации выключено: черновик не создаётся и статья не публикуется. */
export class CannotPublishError extends AppError {
  constructor() {
    super({ code: 'cannot_publish', http_status: 403, message: 'Публикация пока недоступна' })
  }
}

/** Тема снята с публикации: в неё нельзя писать и из неё нельзя публиковать. */
export class TopicArchivedError extends AppError {
  constructor() {
    super({ code: 'topic_archived', http_status: 422, message: 'Тема в архиве' })
  }
}

/** Публикация отклонена: в `reasons` перечислены все причины сразу. */
export class NotPublishableError extends AppError {
  constructor(reasons: readonly string[]) {
    super({
      code: 'not_publishable',
      http_status: 422,
      message: 'Статью пока нельзя опубликовать',
      details: { reasons: [...reasons] },
    })
  }
}
