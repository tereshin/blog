import { AppError } from '@blog/errors'

/** Адрес занят другим владельцем. Прежний адрес владельца остаётся. */
export class SlugTakenError extends AppError {
  constructor(slug: string) {
    super({ code: 'slug_taken', http_status: 409, message: 'Этот адрес уже занят', details: { slug } })
  }
}

/** Служебное слово из списка `RESERVED_SLUGS`. */
export class SlugReservedError extends AppError {
  constructor(slug: string) {
    super({ code: 'slug_reserved', http_status: 422, message: 'Это служебное слово, выберите другой адрес', details: { slug } })
  }
}

/** Не подходит под правило 3–40 символов: `a–z`, цифры, дефис, не с края. */
export class SlugInvalidError extends AppError {
  constructor(slug: string) {
    super({
      code: 'slug_invalid',
      http_status: 422,
      message: 'Адрес: от 3 до 40 символов, латинские буквы, цифры и дефис, дефис не с края',
      details: { slug },
    })
  }
}
