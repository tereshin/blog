export type AppErrorOptions = {
  code: string
  http_status: number
  message: string
  is_operational?: boolean
  cause?: unknown
  details?: Record<string, unknown>
}

/** Корень иерархии ошибок: в HTTP-ответ преобразуется одним обработчиком (см. problem.ts). */
export class AppError extends Error {
  readonly code: string
  readonly http_status: number
  readonly is_operational: boolean
  readonly details: Record<string, unknown> | undefined

  constructor(options: AppErrorOptions) {
    super(options.message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = new.target.name
    this.code = options.code
    this.http_status = options.http_status
    this.is_operational = options.is_operational ?? true
    this.details = options.details
  }
}

type SubErrorOptions = { message?: string; cause?: unknown; details?: Record<string, unknown> }

export class NotFoundError extends AppError {
  constructor(options: SubErrorOptions = {}) {
    super({ code: 'not_found', http_status: 404, message: 'Не найдено', ...options })
  }
}

export class ForbiddenError extends AppError {
  constructor(options: SubErrorOptions = {}) {
    super({ code: 'forbidden', http_status: 403, message: 'Недостаточно прав', ...options })
  }
}

export class UnauthorizedError extends AppError {
  constructor(options: SubErrorOptions = {}) {
    super({ code: 'unauthorized', http_status: 401, message: 'Требуется вход', ...options })
  }
}

export class ValidationError extends AppError {
  constructor(options: SubErrorOptions = {}) {
    super({ code: 'validation_failed', http_status: 422, message: 'Данные не прошли проверку', ...options })
  }
}

export class ConflictError extends AppError {
  constructor(options: SubErrorOptions = {}) {
    super({ code: 'conflict', http_status: 409, message: 'Конфликт состояния', ...options })
  }
}

/** Участник ограничен: чтение разрешено, действия — нет. */
export class RestrictedError extends AppError {
  constructor(options: SubErrorOptions = {}) {
    super({ code: 'restricted', http_status: 403, message: 'Действие недоступно: участник ограничен', ...options })
  }
}
