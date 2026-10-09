import { AppError, UnauthorizedError, ValidationError } from '@blog/errors'

/** Токен поставщика не прошёл проверку издателя, аудитории или срока. */
export class AuthProviderError extends UnauthorizedError {
  constructor(cause?: unknown) {
    super({ message: 'Не удалось подтвердить вход', cause })
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super({ code: 'invalid_credentials', http_status: 401, message: 'Неверная почта или пароль' })
  }
}

export class RegistrationClosedError extends AppError {
  constructor() {
    super({ code: 'registration_closed', http_status: 403, message: 'Регистрация закрыта' })
  }
}

export class AuthFieldError extends ValidationError {
  constructor(field: 'email' | 'password', message: string) {
    super({ message, details: { field } })
  }
}
