import { AppError } from '@blog/errors'

export class PayloadTooLargeError extends AppError {
  constructor(limit: number) {
    super({ code: 'payload_too_large', http_status: 413, message: 'Слишком большой запрос', details: { limit_bytes: limit } })
  }
}
