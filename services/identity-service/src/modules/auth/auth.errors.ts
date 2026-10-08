import { UnauthorizedError } from '@blog/errors'

/** Издатель не подтвердил вход: код, state или подпись id_token не сошлись. */
export class AuthProviderError extends UnauthorizedError {
  constructor(cause?: unknown) {
    super({ message: 'Не удалось подтвердить вход через Google', cause })
  }
}
