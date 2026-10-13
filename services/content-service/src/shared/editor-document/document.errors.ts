import { AppError } from '@blog/errors'
export class InvalidBlockError extends AppError {
  constructor() {
    super({
      code: 'invalid_block',
      http_status: 422,
      message: 'Документ содержит неизвестный блок',
    })
  }
}
export class ForeignFileError extends AppError {
  constructor() {
    super({ code: 'foreign_file', http_status: 422, message: 'Файл должен быть загружен вами' })
  }
}
