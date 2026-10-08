import { NotFoundError } from '@blog/errors'

export class ReactionTargetNotFoundError extends NotFoundError {
  constructor() {
    super({ message: 'Объект реакции недоступен', details: { reason: 'unavailable' } })
  }
}
