import { NotFoundError, ValidationError } from '@blog/errors'

export class InvalidMessageCursorError extends ValidationError {
  constructor() {
    super({ message: 'Курсор сообщений не распознан' })
  }
}

export class PeerNotFoundError extends NotFoundError {
  constructor() {
    super({ message: 'Участник не найден' })
  }
}

export class SelfMessageError extends ValidationError {
  constructor() {
    super({ message: 'Нельзя написать самому себе', details: { reason: 'self' } })
  }
}

export class MessageConversationNotFoundError extends NotFoundError {
  constructor() {
    super({ message: 'Диалог не найден' })
  }
}
