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

/** Адрес уже занят в Firebase: регистрация отвечает так же, как на свободный адрес. */
export class FirebaseEmailExistsError extends AppError {
  constructor() {
    super({ code: 'email_exists', http_status: 409, message: 'адрес уже есть в Firebase' })
  }
}

/**
 * Гонка уникального индекса учётной записи (почта, firebase uid, сессия).
 * Неоперационная: если сервис её не разобрал, наружу уходит обычный 500 без причины.
 */
export class AccountConflictError extends AppError {
  constructor(cause: unknown) {
    super({ code: 'account_conflict', http_status: 500, message: 'Конфликт уникальности учётной записи', is_operational: false, cause })
  }
}
