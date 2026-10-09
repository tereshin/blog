import { AppError } from '@blog/errors'

/** Продвигать можно только опубликованную свою статью. */
export class PromotionNotAllowedError extends AppError {
  constructor() {
    super({ code: 'promotion_not_allowed', http_status: 422, message: 'Продвигать можно только опубликованную статью' })
  }
}
