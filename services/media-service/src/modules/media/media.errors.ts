import { AppError } from '@blog/errors'

export class UnsupportedMediaError extends AppError {
  constructor(mime: string | null) {
    super({
      code: 'unsupported_media_type',
      http_status: 415,
      message: 'Этот тип файла не принимается',
      details: { ...(mime ? { mime } : {}) },
    })
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(limit_bytes: number) {
    super({ code: 'payload_too_large', http_status: 413, message: 'Файл слишком большой', details: { limit_bytes } })
  }
}
