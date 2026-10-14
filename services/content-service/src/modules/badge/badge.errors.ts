import { ValidationError } from '@blog/errors'

/** Из каталога убран бейдж, который уже выдан. */
export class AwardedBadgeRemovalError extends ValidationError {
  constructor() {
    super({ message: 'Выданные бейджи можно архивировать, но нельзя удалять' })
  }
}
